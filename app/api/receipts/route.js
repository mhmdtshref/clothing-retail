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

  const { type, date, companyId, items, billDiscount, taxPercent, note } = parsed;

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


