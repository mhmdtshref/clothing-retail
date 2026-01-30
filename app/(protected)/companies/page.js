export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CompaniesPage from '@/components/companies/CompaniesPage';

export default async function Companies() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/companies');
  return <CompaniesPage />;
}
