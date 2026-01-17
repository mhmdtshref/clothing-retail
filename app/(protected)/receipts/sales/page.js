export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SalesReceiptsPage from '@/components/receipts/SalesReceiptsPage';

export default async function SalesReceiptsRoutePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/receipts/sales');
  return <SalesReceiptsPage />;
}

