export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import DeliveryWizardShell from '@/components/delivery/DeliveryWizardShell';

export default async function DeliveryNewPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/delivery/new');

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();
  const companiesList = companies.map((c) => ({ _id: String(c._id), name: c.name || '' }));

  return <DeliveryWizardShell />;
}


