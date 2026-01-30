export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import CashboxSession from '@/models/cashboxSession';
import CashMovement from '@/models/cashMovement';

const BodySchema = z.object({
  type: z.enum(['in', 'out']),
  amount: z.number().positive(),
  reason: z.string().trim().max(1000).optional(),
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
  const session = await CashboxSession.findOne({ status: 'open' }).lean();
  if (!session) {
    return NextResponse.json(
      { error: 'NoOpenSession', message: 'No open cashbox session' },
      { status: 409 },
    );
  }

  const movement = await CashMovement.create({
    sessionId: session._id,
    amount: Number(body.amount || 0),
    direction: body.type,
    source: 'adjustment',
    method: 'cash',
    note: body.reason || undefined,
    userId,
  });

  return NextResponse.json({ ok: true, movement });
}
