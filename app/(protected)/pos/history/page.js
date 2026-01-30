export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import POSHistoryPage from '@/components/pos/POSHistoryPage';

export default async function POSHistory() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/pos/history');
  return <POSHistoryPage />;
}
