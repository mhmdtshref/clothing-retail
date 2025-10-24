export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getOnHandForVariant } from '@/lib/inventory';

export async function GET(_req, { params }) {
  try {
    const onHand = await getOnHandForVariant(params.variantId);
    return NextResponse.json({ ok: true, variantId: params.variantId, onHand });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}


