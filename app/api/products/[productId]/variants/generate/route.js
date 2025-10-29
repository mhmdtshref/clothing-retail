export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { generateVariantsForProduct } from '@/lib/variant-gen';

const Schema = z.object({
  sizes: z.array(z.string().min(1).trim()).min(1),
  colors: z.array(z.string().min(1).trim()).min(1),
  companyIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req, context) {
  const { userId } = await auth();
  if (!userId) {
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
      sizes: parsed.data.sizes,
      colors: parsed.data.colors,
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
