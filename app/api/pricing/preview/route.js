export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeReceiptTotals } from '@/lib/pricing';

const DiscountSchema = z.object({
  mode: z.enum(['amount', 'percent']),
  value: z.number().nonnegative(),
});

const ItemSchema = z.object({
  qty: z.number().int().positive(),
  unit: z.number().nonnegative(),
  discount: DiscountSchema.optional(),
});

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1),
  billDiscount: DiscountSchema.optional(),
  taxPercent: z.number().min(0).max(100).default(0),
});

export async function POST(req) {
  try {
    const json = await req.json();
    const parsed = BodySchema.parse(json);

    const payload = {
      type: 'sale',
      items: parsed.items.map((i) => ({
        qty: i.qty,
        unitPrice: i.unit,
        discount: i.discount,
      })),
      billDiscount: parsed.billDiscount,
      taxPercent: parsed.taxPercent,
    };

    const result = computeReceiptTotals(payload, { includeItems: true });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid payload' },
      { status: 400 },
    );
  }
}


