export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import Company from '@/models/company';
import { computeReceiptTotals } from '@/lib/pricing';

export async function GET(_req, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params?.id;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await connectToDB();
    const r = await Receipt.findById(id).lean();
    if (!r) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    let companyName = '';
    if (r.companyId) {
      const c = await Company.findById(r.companyId, { name: 1 }).lean();
      companyName = c?.name || '';
    }

    const { totals } = computeReceiptTotals(r);
    return NextResponse.json({ ok: true, receipt: { ...r, companyName }, totals });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


