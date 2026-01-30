export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import CashboxSession from '@/models/cashboxSession';

const BodySchema = z.object({
  openingAmount: z.number().min(0),
});

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
  const existing = await CashboxSession.findOne({ status: 'open' }).lean();
  if (existing) {
    return NextResponse.json(
      { error: 'AlreadyOpen', message: 'Cashbox session already open' },
      { status: 409 },
    );
  }

  const session = await CashboxSession.create({
    openingAmount: Number(body.openingAmount || 0),
    openedBy: userId,
    status: 'open',
  });

  return NextResponse.json({ ok: true, session });
}
