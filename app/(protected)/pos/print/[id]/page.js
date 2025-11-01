export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import Company from '@/models/company';
import { computeReceiptTotals } from '@/lib/pricing';
import ReceiptPrintTemplate from '@/components/pos/ReceiptPrintTemplate';

export default async function POSPrintPage({ params }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/pos');

  await connectToDB();
  const r = await Receipt.findById(params.id).lean();
  if (!r) {
    return <div style={{ padding: 16 }}>Receipt not found</div>;
  }
  if (r.companyId) {
    const c = await Company.findById(r.companyId, { name: 1 }).lean();
    r.companyName = c?.name || '';
  }
  const { totals } = computeReceiptTotals(r);

  return <ReceiptPrintTemplate receipt={r} totals={totals} autoPrint />;
}


