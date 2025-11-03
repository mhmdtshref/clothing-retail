export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';
import Company from '@/models/company';
import Customer from '@/models/customer';
import { computeReceiptTotals } from '@/lib/pricing';
import ReceiptPrintTemplate from '@/components/pos/ReceiptPrintTemplate';

export default async function POSPrintPage({ params }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/pos');

  await connectToDB();
  const { id } = await params;
  const r = await Receipt.findById(id).lean();
  if (!r) {
    return <div style={{ padding: 16 }}>Receipt not found</div>;
  }
  if (r.companyId) {
    const c = await Company.findById(r.companyId, { name: 1 }).lean();
    r.companyName = c?.name || '';
  }
  if (r.customerId) {
    const cu = await Customer.findById(r.customerId, { name: 1, phone: 1 }).lean();
    r.customer = cu ? { _id: String(cu._id), name: cu.name || '', phone: cu.phone } : null;
  }
  const { totals } = computeReceiptTotals(r);

  const receipt = {
    ...r,
    _id: String(r._id),
    companyId: r.companyId ? String(r.companyId) : undefined,
    customerId: r.customerId ? String(r.customerId) : undefined,
    items: (r.items || []).map((it) => ({ ...it, variantId: String(it.variantId) })),
  };

  return <ReceiptPrintTemplate receipt={receipt} totals={totals} autoPrint />;
}


