export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Variant from '@/models/variant';
import { getOnHandForVariant } from '@/lib/inventory';

export async function GET(_req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { variantId } = await context.params;

  try {
    const onHand = await getOnHandForVariant(variantId);
    return NextResponse.json({ ok: true, variantId, onHand });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

const PatchSchema = z.object({
  qty: z.number().int(),
});

export async function PATCH(req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { variantId } = await context.params;
  if (!variantId || !mongoose.isValidObjectId(variantId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let input;
  try {
    input = PatchSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'ValidationError', message: err?.message || 'Invalid body' },
      { status: 400 },
    );
  }

  try {
    await connectToDB();
    const doc = await Variant.findByIdAndUpdate(
      variantId,
      { $set: { qty: input.qty } },
      { new: true, projection: { qty: 1 } },
    )
      .lean()
      .exec();

    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    return NextResponse.json({ ok: true, variantId, qty: Number(doc.qty ?? 0) });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
