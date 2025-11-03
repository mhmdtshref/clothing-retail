export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import { computeReceiptTotals } from '@/lib/pricing';

const BodySchema = z.object({
  amount: z.number().positive(),
  method: z.string().trim().optional().default('cash'),
  note: z.string().max(1000).optional(),
});

export async function POST(req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid payload' },
      { status: 400 },
    );
  }

  const params = await context.params;
  const { id } = params || {};
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await connectToDB();
    const r = await Receipt.findById(id).lean();
    if (!r) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    if (r.type !== 'sale') {
      return NextResponse.json({ error: 'InvalidOperation', message: 'Payments supported for sale receipts only' }, { status: 400 });
    }
    if (r.status === 'completed') {
      return NextResponse.json({ error: 'Locked', message: 'Receipt already completed' }, { status: 409 });
    }

    const { totals } = computeReceiptTotals(r);
    const paidSoFar = Array.isArray(r.payments)
      ? r.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
      : 0;
    const dueBefore = Math.max(0, Number(totals?.grandTotal || 0) - paidSoFar);
    const amount = Number(body.amount || 0);
    if (!(amount > 0)) {
      return NextResponse.json({ error: 'ValidationError', message: 'Amount must be > 0' }, { status: 400 });
    }
    if (amount > dueBefore) {
      return NextResponse.json({ error: 'ValidationError', message: 'Amount exceeds due total' }, { status: 400 });
    }

    const paymentDoc = {
      amount,
      method: body.method || 'cash',
      note: body.note || undefined,
      at: new Date(),
    };

    const updates = { $push: { payments: paymentDoc } };
    if (amount === dueBefore) {
      updates.$set = { status: 'completed' };
    }

    const updated = await Receipt.findByIdAndUpdate(id, updates, { new: true }).lean();
    const { totals: tot2 } = computeReceiptTotals(updated);
    const paidTotal = Array.isArray(updated.payments)
      ? updated.payments.reduce((acc, p) => acc + Number(p?.amount || 0), 0)
      : 0;
    const dueTotal = Math.max(0, Number(tot2?.grandTotal || 0) - paidTotal);

    return NextResponse.json({
      ok: true,
      receipt: {
        _id: updated._id,
        status: updated.status,
        payments: updated.payments,
        date: updated.date,
        type: updated.type,
      },
      paidTotal,
      dueTotal,
      totals: tot2,
    });
  } catch (err) {
    return NextResponse.json({ error: 'InternalServerError', message: err?.message || String(err) }, { status: 500 });
  }
}


