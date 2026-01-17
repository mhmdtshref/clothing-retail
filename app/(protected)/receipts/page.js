export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import ReceiptsListPage from '@/components/receipts/ReceiptsListPage';

export default async function ReceiptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/receipts');

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();

  return (
    <ReceiptsListPage
      receiptType="purchase"
      companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
    />
  );
}
