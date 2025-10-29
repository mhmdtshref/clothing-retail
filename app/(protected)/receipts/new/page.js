export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import NewPurchaseReceipt from '@/components/receipts/NewPurchaseReceipt';

export default async function NewReceiptPurchasePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/receipts/new');

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();

  return (
    <NewPurchaseReceipt companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))} />
  );
}
