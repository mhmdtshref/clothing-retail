export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ensureReceiptEditable } from '@/lib/receipt-guards';
import Receipt from '@/models/receipt';
import { connectToDB } from '@/lib/mongoose';

export async function GET(_req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const params = await context.params;
    const { id } = params || {};
    await connectToDB();
    const r = await Receipt.findById(id).select({ status: 1, date: 1 }).lean();
    if (!r) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    try {
      await ensureReceiptEditable(id);
      return NextResponse.json({ ok: true, editable: true, status: r.status });
    } catch (e) {
      if (e.code === 'RECEIPT_LOCKED') {
        return NextResponse.json({ ok: true, editable: false, status: r.status });
      }
      return NextResponse.json({ error: e.message || 'Error' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}


