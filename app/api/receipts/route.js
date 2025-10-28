export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';
import Variant from '@/models/variant';
import Company from '@/models/company';
import Receipt from '@/models/receipt';
import { computeReceiptTotals } from '@/lib/pricing';

// GET: list receipts
const QuerySchema = z.object({
  query: z.string().trim().optional().default(''),
  status: z.enum(['ordered', 'on_delivery', 'completed', 'all']).optional().default('all'),
  companyId: z.string().trim().optional().default(''),
  dateFrom: z.string().trim().optional().default(''),
  dateTo: z.string().trim().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.enum(['date', 'createdAt', 'status']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'ValidationError', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    query: q,
    status,
    companyId,
    dateFrom,
    dateTo,
    page,
    limit,
    sort,
    order,
  } = parsed.data;

  const filter = {};
  if (status !== 'all') filter.status = status;
  if (companyId) filter.companyId = new mongoose.Types.ObjectId(companyId);

  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) filter.date.$lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const or = [];
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    or.push({ note: rx });
    or.push({ 'items.snapshot.productCode': rx });
    or.push({ 'items.snapshot.productName': rx });
  }
  if (or.length) filter.$or = or;

  const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  try {
    await connectToDB();

    const pipeline = [
      { $match: filter },
      { $sort: sortObj },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: Company.collection.name,
                localField: 'companyId',
                foreignField: '_id',
                as: 'company',
              },
            },
            { $addFields: { companyName: { $ifNull: [{ $arrayElemAt: ['$company.name', 0] }, '' ] } } },
            { $project: {
                company: 0,
                _id: 1,
                date: 1,
                createdAt: 1,
                status: 1,
                companyId: 1,
                companyName: 1,
                type: 1,
                items: 1,
                billDiscount: 1,
                taxPercent: 1,
              }
            },
          ],
          total: [ { $count: 'n' } ],
        },
      },
      { $project: { items: 1, total: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] } } },
    ];

    const agg = await Receipt.aggregate(pipeline).allowDiskUse(true);
    const { items, total } = agg[0] || { items: [], total: 0 };

    const rows = items.map((r) => {
      const { totals } = computeReceiptTotals({
        type: r.type || 'purchase',
        items: (r.items || []).map((it) => ({
          qty: Number(it.qty) || 0,
          unitCost: Number(it.unitCost || 0),
          discount: it.discount ? { mode: it.discount.mode, value: Number(it.discount.value || 0) } : undefined,
        })),
        billDiscount: r.billDiscount ? { mode: r.billDiscount.mode, value: Number(r.billDiscount.value || 0) } : undefined,
        taxPercent: Number(r.taxPercent || 0),
      });

      return {
        _id: r._id,
        date: r.date,
        status: r.status,
        company: { id: r.companyId, name: r.companyName },
        itemCount: Array.isArray(r.items) ? r.items.length : 0,
        grandTotal: totals.grandTotal,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({
      ok: true,
      items: rows,
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        sort,
        order,
        query: q,
        status,
        companyId,
        dateFrom,
        dateTo,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}

const DiscountSchema = z.object({
  mode: z.enum(['amount', 'percent']),
  value: z.number().nonnegative(),
});

const ItemSchema = z.object({
  variantId: z.string().min(1),
  qty: z.number().int().positive(),
  unitCost: z.number().nonnegative().optional().default(0),
  unitPrice: z.number().nonnegative().optional().default(0),
  discount: DiscountSchema.optional(),
});

const BodySchema = z.object({
  type: z.enum(['purchase', 'sale']).default('purchase'),
  date: z.coerce.date().optional(),
  status: z.enum(['ordered', 'on_delivery', 'completed']).optional().default('ordered'),
  companyId: z.string().min(1).optional(),
  items: z.array(ItemSchema).min(1, 'At least one item is required'),
  billDiscount: DiscountSchema.optional(),
  taxPercent: z.number().min(0).max(100).default(0),
  note: z.string().max(1000).optional(),
});

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let parsed;
  try {
    const json = await req.json();
    parsed = BodySchema.parse(json);
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid payload' },
      { status: 400 },
    );
  }

  const { type, date, status, companyId, items, billDiscount, taxPercent, note } = parsed;

  if (type === 'purchase' && !companyId) {
    return NextResponse.json(
      { error: 'ValidationError', message: 'companyId is required for purchase receipts' },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    if (type === 'purchase') {
      const companyExists = await Company.exists({ _id: companyId });
      if (!companyExists) {
        return NextResponse.json(
          { error: 'ValidationError', message: 'companyId does not exist' },
          { status: 400 },
        );
      }
    }

    const variantIds = items.map((i) => new mongoose.Types.ObjectId(i.variantId));
    const variants = await Variant.find({ _id: { $in: variantIds } }).lean().exec();
    if (variants.length !== variantIds.length) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'One or more variantId not found' },
        { status: 400 },
      );
    }

    const productIdSet = new Set(variants.map((v) => String(v.productId)));
    const productIds = [...productIdSet].map((id) => new mongoose.Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: productIds } }, { code: 1, name: 1 }).lean().exec();
    const productMap = new Map(products.map((p) => [String(p._id), p]));
    const variantMap = new Map(variants.map((v) => [String(v._id), v]));

    const receiptItems = items.map((i) => {
      const v = variantMap.get(i.variantId);
      const p = v ? productMap.get(String(v.productId)) : null;

      return {
        variantId: v._id,
        qty: i.qty,
        unitCost: Number(i.unitCost || 0),
        unitPrice: Number(i.unitPrice || 0),
        discount: i.discount ? { mode: i.discount.mode, value: Number(i.discount.value || 0) } : undefined,
        snapshot: {
          productCode: p?.code || '',
          productName: p?.name || '',
          size: v.size,
          color: v.color,
        },
      };
    });

    const receiptPayload = {
      type,
      date: date || new Date(),
      status,
      companyId: type === 'purchase' ? companyId : undefined,
      items: receiptItems,
      billDiscount: billDiscount ? { mode: billDiscount.mode, value: Number(billDiscount.value || 0) } : undefined,
      taxPercent: Number(taxPercent || 0),
      note: note || undefined,
    };

    const { totals, items: pricedItems } = computeReceiptTotals(receiptPayload, { includeItems: true });

    const doc = await Receipt.create(receiptPayload);

    return NextResponse.json(
      {
        ok: true,
        receipt: {
          _id: doc._id,
          type: doc.type,
          date: doc.date,
          status: doc.status,
          companyId: doc.companyId || null,
          items: doc.items.map((it) => ({
            variantId: it.variantId,
            qty: it.qty,
            unitCost: it.unitCost,
            unitPrice: it.unitPrice,
            discount: it.discount || null,
            snapshot: it.snapshot || null,
          })),
          billDiscount: doc.billDiscount || null,
          taxPercent: doc.taxPercent,
          note: doc.note || '',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
        totals,
        pricing: { items: pricedItems },
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


