export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import DeliveryWizardShell from '@/components/delivery/DeliveryWizardShell';

export default async function DeliveryNewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/delivery/new');

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();
  const companiesList = companies.map((c) => ({ _id: String(c._id), name: c.name || '' }));

  return <DeliveryWizardShell />;
}
