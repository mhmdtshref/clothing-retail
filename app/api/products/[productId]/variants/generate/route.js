export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { generateVariantsForProduct } from '@/lib/variant-gen';

const Schema = z.object({
  sizeIds: z.array(z.string().min(1)).min(1),
  colorIds: z.array(z.string().min(1)).min(1),
  companyIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { productId } = await context.params;
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: parsed.error.flatten?.() || parsed.error },
        { status: 400 },
      );
    }

    const result = await generateVariantsForProduct({
      productId,
      sizeIds: parsed.data.sizeIds,
      colorIds: parsed.data.colorIds,
      companyIds: parsed.data.companyIds,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    // Handle duplicate key races gracefully
    if (err?.code === 11000) {
      return NextResponse.json(
        {
          ok: true,
          created: 0,
          skippedExisting: 'some or all existed (11000)',
          requested: 'unknown',
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
