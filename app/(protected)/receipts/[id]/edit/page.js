export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import EditPurchaseReceiptPage from '@/components/receipts/EditPurchaseReceiptPage';

export default async function ReceiptEditPage({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/receipts/${id}/edit`);

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();

  return (
    <EditPurchaseReceiptPage
      id={String(id)}
      companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
    />
  );
}

