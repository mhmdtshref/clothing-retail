export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import Company from '@/models/company';
import Customer from '@/models/customer';
import { computeReceiptTotals } from '@/lib/pricing';

export async function GET(_req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
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

    let customer = null;
    if (r.customerId) {
      const c = await Customer.findById(r.customerId, { name: 1, phone: 1 }).lean();
      customer = c ? { _id: c._id, name: c.name || '', phone: c.phone } : null;
    }

    const { totals } = computeReceiptTotals(r);
    return NextResponse.json({ ok: true, receipt: { ...r, companyName, customer }, totals });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


