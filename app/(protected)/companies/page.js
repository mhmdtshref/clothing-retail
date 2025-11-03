export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CompaniesPage from '@/components/companies/CompaniesPage';

export default async function Companies() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/companies');
  return <CompaniesPage />;
}


