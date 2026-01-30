export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import CashboxSession from '@/models/cashboxSession';
import CashMovement from '@/models/cashMovement';

const BodySchema = z.object({
  countedAmount: z.number().min(0),
  note: z.string().trim().max(1000).optional(),
});

function summarize(rows = []) {
  const sum = {
    in: 0,
    out: 0,
    bySource: { sale: 0, payment: 0, return: 0, adjustmentIn: 0, adjustmentOut: 0 },
  };
  for (const r of rows) {
    const direction = r._id?.direction;
    const source = r._id?.source;
    const total = Number(r.total || 0);
    if (direction === 'in') sum.in += total;
    if (direction === 'out') sum.out += total;
    if (source === 'sale') sum.bySource.sale += total;
    if (source === 'payment') sum.bySource.payment += total;
    if (source === 'return') sum.bySource.return += total;
    if (source === 'adjustment' && direction === 'in') sum.bySource.adjustmentIn += total;
    if (source === 'adjustment' && direction === 'out') sum.bySource.adjustmentOut += total;
  }
  return sum;
}

export async function POST(req) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = authSession.user?.id;
  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid payload' },
      { status: 400 },
    );
  }

  await connectToDB();
  const session = await CashboxSession.findOne({ status: 'open' });
  if (!session) {
    return NextResponse.json(
      { error: 'NoOpenSession', message: 'No open cashbox session' },
      { status: 409 },
    );
  }

  const rows = await CashMovement.aggregate([
    { $match: { sessionId: new mongoose.Types.ObjectId(String(session._id)) } },
    { $group: { _id: { direction: '$direction', source: '$source' }, total: { $sum: '$amount' } } },
  ]);
  const sums = summarize(rows);
  const expectedCash =
    Number(session.openingAmount || 0) + Number(sums.in || 0) - Number(sums.out || 0);

  session.status = 'closed';
  session.closedAt = new Date();
  session.closedBy = userId;
  session.closeNote = body.note || undefined;
  session.countedAmount = Number(body.countedAmount || 0);
  session.variance = Number(session.countedAmount) - Number(expectedCash);
  session.totals = {
    cashIn: Number(sums.in || 0),
    cashOut: Number(sums.out || 0),
    bySource: {
      sale: Number(sums.bySource.sale || 0),
      payment: Number(sums.bySource.payment || 0),
      return: Number(sums.bySource.return || 0),
      adjustmentIn: Number(sums.bySource.adjustmentIn || 0),
      adjustmentOut: Number(sums.bySource.adjustmentOut || 0),
    },
  };
  await session.save();

  return NextResponse.json({
    ok: true,
    report: {
      sessionId: session._id,
      openedAt: session.openedAt,
      openedBy: session.openedBy,
      closedAt: session.closedAt,
      closedBy: session.closedBy,
      openingAmount: Number(session.openingAmount || 0),
      expectedCash,
      countedAmount: Number(session.countedAmount || 0),
      variance: Number(session.variance || 0),
      totals: session.totals,
    },
  });
}
