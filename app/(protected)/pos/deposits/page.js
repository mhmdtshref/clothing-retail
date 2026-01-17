export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DepositReceiptsPage from '@/components/pos/DepositReceiptsPage';

export default async function POSDepositReceiptsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/pos/deposits');
  return <DepositReceiptsPage />;
}

