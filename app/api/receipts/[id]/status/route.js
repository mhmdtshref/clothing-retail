export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import { ensureReceiptEditable, assertStatusTransition } from '@/lib/receipt-guards';

const BodySchema = z.object({
  status: z.enum(['ordered', 'on_delivery', 'payment_collected', 'ready_to_receive', 'completed', 'pending']),
});

export async function PATCH(req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let next;
  try {
    const body = await req.json();
    const parsed = BodySchema.parse(body);
    next = parsed.status;
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid body' },
      { status: 400 },
    );
  }

  try {
    const params = await context.params;
    const { id } = params || {};
    await connectToDB();
    const current = await ensureReceiptEditable(id);
    assertStatusTransition(current, next);

    const updated = await Receipt.findByIdAndUpdate(
      id,
      { $set: { status: next } },
      { new: true, projection: { _id: 1, status: 1, date: 1 } },
    ).lean();

    if (!updated) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ ok: true, _id: updated._id, status: updated.status });
  } catch (err) {
    const code = err?.code;
    if (code === 'RECEIPT_NOT_FOUND')
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    if (code === 'RECEIPT_LOCKED')
      return NextResponse.json({ error: 'Locked: completed' }, { status: 409 });
    if (code === 'INVALID_STATUS_TRANSITION')
      return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
