export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import Company from '@/models/company';
import Customer from '@/models/customer';
import Product from '@/models/product';
import Variant from '@/models/variant';
import VariantSize from '@/models/variantSize';
import VariantColor from '@/models/variantColor';
import { computeReceiptTotals } from '@/lib/pricing';
import { ensureReceiptEditable, assertStatusTransition } from '@/lib/receipt-guards';
import { pickLocalizedName } from '@/lib/i18n/name';
import { normalizeLocale } from '@/lib/i18n/config';

export async function GET(_req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await connectToDB();
    const r = await Receipt.findById(id).lean();
    if (!r) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    let companyName = '';
    if (r.companyId) {
      const c = await Company.findById(r.companyId, { name: 1 }).lean();
      companyName = c?.name || '';
    }

    let customer = null;
    if (r.customerId) {
      const c = await Customer.findById(r.customerId, { name: 1, phone: 1 }).lean();
      customer = c ? { _id: String(c._id), name: c.name || '', phone: c.phone } : null;
    }

    const { totals } = computeReceiptTotals(r);
    const paidTotal = Array.isArray(r.payments)
      ? r.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
      : 0;
    const dueTotal = Math.max(0, Number(totals?.grandTotal || 0) - paidTotal);
    return NextResponse.json({
      ok: true,
      receipt: { ...r, companyName, customer },
      totals,
      paidTotal,
      dueTotal,
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
  discount: DiscountSchema.optional(),
});

const PatchSchema = z
  .object({
    type: z.enum(['purchase']).optional(),
    status: z.enum(['ordered', 'on_delivery', 'completed']).optional(),
    companyId: z.string().min(1),
    items: z.array(ItemSchema).min(1),
    billDiscount: DiscountSchema.optional(),
    taxPercent: z.number().min(0).max(100).optional().default(0),
    note: z.string().max(1000).optional(),
  })
  .passthrough();

export async function PATCH(req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const locale = normalizeLocale(req?.cookies?.get?.('lang')?.value);

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body;
  try {
    body = PatchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid payload' },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    const { status: currentStatus, type } = await ensureReceiptEditable(id);
    if (type !== 'purchase') {
      return NextResponse.json(
        { error: 'InvalidOperation', message: 'Only purchase receipts can be updated here' },
        { status: 400 },
      );
    }

    const existing = await Receipt.findById(id).lean().exec();
    if (!existing) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    if (existing.type !== 'purchase') {
      return NextResponse.json(
        { error: 'InvalidOperation', message: 'Only purchase receipts can be updated here' },
        { status: 400 },
      );
    }

    if (body.status) {
      assertStatusTransition(currentStatus, body.status, { type: 'purchase' });
    }

    const supplierId = body.companyId;
    const companyExists = await Company.exists({ _id: supplierId });
    if (!companyExists) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'companyId does not exist' },
        { status: 400 },
      );
    }

    const variantIds = body.items.map((i) => new mongoose.Types.ObjectId(i.variantId));
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
    const productIds = [...productIdSet].map((pid) => new mongoose.Types.ObjectId(pid));
    const products = await Product.find({ _id: { $in: productIds } }, { code: 1, localCode: 1 })
      .lean()
      .exec();
    const productMap = new Map(products.map((p) => [String(p._id), p]));
    const variantMap = new Map(variants.map((v) => [String(v._id), v]));

    const sizeIdSet = new Set(variants.map((v) => String(v?.sizeId || '')).filter(Boolean));
    const colorIdSet = new Set(variants.map((v) => String(v?.colorId || '')).filter(Boolean));
    const sizeIds = [...sizeIdSet].map((sid) => new mongoose.Types.ObjectId(sid));
    const colorIds = [...colorIdSet].map((cid) => new mongoose.Types.ObjectId(cid));

    const sizes = sizeIds.length
      ? await VariantSize.find({ _id: { $in: sizeIds } }, { name: 1 })
          .lean()
          .exec()
      : [];
    const colors = colorIds.length
      ? await VariantColor.find({ _id: { $in: colorIds } }, { name: 1 })
          .lean()
          .exec()
      : [];
    const sizeNameById = new Map(sizes.map((s) => [String(s._id), s.name]));
    const colorNameById = new Map(colors.map((c) => [String(c._id), c.name]));

    const receiptItems = body.items.map((i) => {
      const v = variantMap.get(i.variantId);
      const p = v ? productMap.get(String(v.productId)) : null;
      const sizeName = pickLocalizedName(sizeNameById.get(String(v?.sizeId || '')), locale);
      const colorName = pickLocalizedName(colorNameById.get(String(v?.colorId || '')), locale);
      return {
        variantId: v._id,
        qty: i.qty,
        unitCost: Number(i.unitCost || 0),
        unitPrice: 0,
        discount: i.discount
          ? { mode: i.discount.mode, value: Number(i.discount.value || 0) }
          : undefined,
        snapshot: {
          productCode: p?.code || '',
          productName: p?.localCode || '',
          size: sizeName,
          color: colorName,
        },
      };
    });

    const receiptUpdate = {
      ...(body.status ? { status: body.status } : {}),
      companyId: new mongoose.Types.ObjectId(supplierId),
      items: receiptItems,
      billDiscount: body.billDiscount
        ? { mode: body.billDiscount.mode, value: Number(body.billDiscount.value || 0) }
        : undefined,
      taxPercent: Number(body.taxPercent || 0),
      note: body.note || undefined,
    };

    // Inventory delta (purchase receipts adjust stock positively)
    const oldByVariant = new Map();
    for (const it of existing.items || []) {
      const key = String(it?.variantId || '');
      if (!key) continue;
      oldByVariant.set(key, (oldByVariant.get(key) || 0) + Number(it?.qty || 0));
    }
    const newByVariant = new Map();
    for (const it of receiptItems || []) {
      const key = String(it?.variantId || '');
      if (!key) continue;
      newByVariant.set(key, (newByVariant.get(key) || 0) + Number(it?.qty || 0));
    }
    const allVariantIds = new Set([...oldByVariant.keys(), ...newByVariant.keys()]);
    const ops = [];
    for (const vid of allVariantIds) {
      const delta = (newByVariant.get(vid) || 0) - (oldByVariant.get(vid) || 0);
      if (!delta) continue;
      ops.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(vid) },
          update: { $inc: { qty: delta } },
        },
      });
    }

    const payloadForTotals = {
      type: 'purchase',
      date: existing.date || new Date(),
      status: receiptUpdate.status || existing.status,
      companyId: receiptUpdate.companyId,
      items: receiptItems,
      billDiscount: receiptUpdate.billDiscount,
      taxPercent: receiptUpdate.taxPercent,
      note: receiptUpdate.note,
    };
    const { totals } = computeReceiptTotals(payloadForTotals);

    let updated;
    const session = await mongoose.startSession().catch(() => null);
    if (session) {
      try {
        await session.withTransaction(async () => {
          updated = await Receipt.findByIdAndUpdate(
            id,
            { $set: receiptUpdate },
            { new: true, session },
          ).lean();
          if (ops.length) await Variant.bulkWrite(ops, { session });
        });
      } catch (_txErr) {
        updated = await Receipt.findByIdAndUpdate(
          id,
          { $set: receiptUpdate },
          { new: true },
        ).lean();
        if (ops.length) await Variant.bulkWrite(ops);
      } finally {
        await session.endSession();
      }
    } else {
      updated = await Receipt.findByIdAndUpdate(id, { $set: receiptUpdate }, { new: true }).lean();
      if (ops.length) await Variant.bulkWrite(ops);
    }

    if (!updated) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const paidTotal = Array.isArray(updated.payments)
      ? updated.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
      : 0;
    const dueTotal = Math.max(0, Number(totals?.grandTotal || 0) - paidTotal);

    return NextResponse.json({
      ok: true,
      receipt: {
        _id: updated._id,
        type: updated.type,
        date: updated.date,
        status: updated.status,
        companyId: updated.companyId || null,
        customerId: updated.customerId || null,
        items: updated.items,
        billDiscount: updated.billDiscount || null,
        taxPercent: updated.taxPercent,
        note: updated.note || '',
        payments: Array.isArray(updated.payments) ? updated.payments : [],
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      totals,
      paidTotal,
      dueTotal,
    });
  } catch (err) {
    const code = err?.code;
    if (code === 'RECEIPT_NOT_FOUND')
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    if (code === 'RECEIPT_LOCKED')
      return NextResponse.json({ error: 'Locked: completed' }, { status: 409 });
    if (code === 'INVALID_STATUS_TRANSITION')
      return NextResponse.json({ error: err.message }, { status: 400 });

    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
