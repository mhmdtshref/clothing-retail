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
  status: z.enum(['ordered', 'on_delivery', 'completed', 'pending', 'all']).optional().default('all'),
  type: z.enum(['purchase', 'sale', 'sale_return', 'all']).optional().default('all'),
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

  const { query: q, status, type, companyId, dateFrom, dateTo, page, limit, sort, order } = parsed.data;

  const filter = {};
  if (status !== 'all') filter.status = status;
  if (type !== 'all') filter.type = type;
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
            {
              $addFields: {
                companyName: { $ifNull: [{ $arrayElemAt: ['$company.name', 0] }, ''] },
              },
            },
            {
              $project: {
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
                payments: 1,
              },
            },
          ],
          total: [{ $count: 'n' }],
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
          unitPrice: Number(it.unitPrice || 0),
          discount: it.discount
            ? { mode: it.discount.mode, value: Number(it.discount.value || 0) }
            : undefined,
        })),
        billDiscount: r.billDiscount
          ? { mode: r.billDiscount.mode, value: Number(r.billDiscount.value || 0) }
          : undefined,
        taxPercent: Number(r.taxPercent || 0),
      });

      const paidTotal = Array.isArray(r.payments)
        ? r.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
        : 0;
      const dueTotal = Math.max(0, Number(totals.grandTotal || 0) - paidTotal);

      return {
        _id: r._id,
        date: r.date,
        status: r.status,
        type: r.type,
        company: { id: r.companyId, name: r.companyName },
        itemCount: Array.isArray(r.items) ? r.items.length : 0,
        grandTotal: totals.grandTotal,
        paidTotal,
        dueTotal,
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

const PaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string().trim().optional().default('cash'),
  note: z.string().max(1000).optional(),
  at: z.coerce.date().optional(),
});

const BodySchema = z.object({
  type: z.enum(['purchase', 'sale', 'sale_return']).default('purchase'),
  date: z.coerce.date().optional(),
  status: z.enum(['ordered', 'on_delivery', 'completed', 'pending']).optional(),
  companyId: z.string().min(1).optional(),
  vendorId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  items: z.array(ItemSchema).min(1, 'At least one item is required'),
  billDiscount: DiscountSchema.optional(),
  taxPercent: z.number().min(0).max(100).default(0),
  note: z.string().max(1000).optional(),
  returnReason: z.string().max(500).optional(),
  payments: z.array(PaymentSchema).optional().default([]),
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

  const {
    type,
    date,
    status,
    companyId,
    vendorId,
    customerId,
    items,
    billDiscount,
    taxPercent,
    note,
    returnReason,
    payments,
  } = parsed;

  const supplierId = companyId || vendorId || undefined;
  if (type === 'purchase' && !supplierId) {
    return NextResponse.json(
      { error: 'ValidationError', message: 'companyId is required for purchase receipts' },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    if (type === 'purchase') {
      const companyExists = await Company.exists({ _id: supplierId });
      if (!companyExists) {
        return NextResponse.json(
          { error: 'ValidationError', message: 'companyId does not exist' },
          { status: 400 },
        );
      }
    }

    const variantIds = items.map((i) => new mongoose.Types.ObjectId(i.variantId));
    const variants = await Variant.find({ _id: { $in: variantIds } })
      .lean()
      .exec();
    if (variants.length !== variantIds.length) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'One or more variantId not found' },
        { status: 400 },
      );
    }

    const productIdSet = new Set(variants.map((v) => String(v.productId)));
    const productIds = [...productIdSet].map((id) => new mongoose.Types.ObjectId(id));
    const products = await Product.find({ _id: { $in: productIds } }, { code: 1, name: 1 })
      .lean()
      .exec();
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
        discount: i.discount
          ? { mode: i.discount.mode, value: Number(i.discount.value || 0) }
          : undefined,
        snapshot: {
          productCode: p?.code || '',
          productName: p?.name || '',
          size: v.size,
          color: v.color,
        },
      };
    });

    const computedStatus = status || (type === 'purchase' ? 'ordered' : 'completed');
    const receiptPayload = {
      type,
      date: date || new Date(),
      status: computedStatus,
      companyId: type === 'purchase' ? supplierId : undefined,
      customerId: type !== 'purchase' && customerId ? new mongoose.Types.ObjectId(customerId) : undefined,
      items: receiptItems,
      billDiscount: billDiscount
        ? { mode: billDiscount.mode, value: Number(billDiscount.value || 0) }
        : undefined,
      taxPercent: Number(taxPercent || 0),
      note: note || undefined,
      ...(type === 'sale_return' && returnReason ? { returnReason } : {}),
    };

    const { totals, items: pricedItems } = computeReceiptTotals(receiptPayload, {
      includeItems: true,
    });

    // Pending sale validations
    if (type === 'sale' && computedStatus === 'pending') {
      if (!customerId) {
        return NextResponse.json(
          { error: 'ValidationError', message: 'customerId is required for pending sales' },
          { status: 400 },
        );
      }
      const depositTotal = Array.isArray(payments)
        ? payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
        : 0;
      if (!(depositTotal > 0)) {
        return NextResponse.json(
          { error: 'ValidationError', message: 'Deposit amount must be greater than 0' },
          { status: 400 },
        );
      }
      if (depositTotal > totals.grandTotal) {
        return NextResponse.json(
          { error: 'ValidationError', message: 'Deposit cannot exceed grand total' },
          { status: 400 },
        );
      }
    }

    // Normalize and attach payments only for sales
    if (type === 'sale') {
      const normalizedPayments = (Array.isArray(payments) ? payments : []).map((p) => ({
        amount: Number(p.amount || 0),
        method: p.method || 'cash',
        note: p.note || undefined,
        at: p.at ? new Date(p.at) : new Date(),
      }));
      if (normalizedPayments.length) {
        receiptPayload.payments = normalizedPayments;
      }
    }

    // Build inventory adjustment ops: purchase/sale_return => +qty; sale => -qty
    const sign = type === 'sale' ? -1 : 1;
    const deltaByVariant = new Map();
    for (const it of receiptItems) {
      const key = String(it.variantId);
      const prev = deltaByVariant.get(key) || 0;
      deltaByVariant.set(key, prev + sign * Number(it.qty || 0));
    }
    const ops = Array.from(deltaByVariant.entries()).map(([variantId, delta]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(variantId) },
        update: { $inc: { qty: delta } },
      },
    }));

    let doc;
    // Try to commit receipt creation and inventory update atomically when supported
    const session = await mongoose.startSession().catch(() => null);
    if (session) {
      try {
        await session.withTransaction(async () => {
          const created = await Receipt.create([receiptPayload], { session });
          doc = created[0];
          if (ops.length) await Variant.bulkWrite(ops, { session });
        });
      } catch (txErr) {
        // Fallback for standalone servers without transaction support
        doc = await Receipt.create(receiptPayload);
        if (ops.length) await Variant.bulkWrite(ops);
      } finally {
        await session.endSession();
      }
    } else {
      doc = await Receipt.create(receiptPayload);
      if (ops.length) await Variant.bulkWrite(ops);
    }

    // Compute paid/due balances from created doc
    const createdPaid = Array.isArray(doc?.payments)
      ? doc.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
      : 0;
    const createdDue = Math.max(0, Number(totals?.grandTotal || 0) - createdPaid);

    return NextResponse.json(
      {
        ok: true,
        receipt: {
          _id: doc._id,
          type: doc.type,
          date: doc.date,
          status: doc.status,
          companyId: doc.companyId || null,
          customerId: doc.customerId || null,
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
          payments: Array.isArray(doc.payments)
            ? doc.payments.map((p) => ({ amount: p.amount, method: p.method || 'cash', note: p.note || '', at: p.at }))
            : [],
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
        totals,
        pricing: { items: pricedItems },
        paidTotal: createdPaid,
        dueTotal: createdDue,
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
