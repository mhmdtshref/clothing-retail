export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import CashboxSession from '@/models/cashboxSession';
import CashMovement from '@/models/cashMovement';

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

export async function GET() {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectToDB();

  const session = await CashboxSession.findOne({ status: 'open' }).sort({ openedAt: -1 }).lean();
  if (!session) {
    return NextResponse.json({ ok: true, open: false });
  }

  const rows = await CashMovement.aggregate([
    { $match: { sessionId: new mongoose.Types.ObjectId(String(session._id)) } },
    { $group: { _id: { direction: '$direction', source: '$source' }, total: { $sum: '$amount' } } },
  ]);
  const sums = summarize(rows);

  const expectedCash =
    Number(session.openingAmount || 0) + Number(sums.in || 0) - Number(sums.out || 0);

  return NextResponse.json({
    ok: true,
    open: true,
    session,
    summary: {
      openingAmount: Number(session.openingAmount || 0),
      cashIn: Number(sums.in || 0),
      cashOut: Number(sums.out || 0),
      expectedCash,
      bySource: sums.bySource,
    },
  });
}
