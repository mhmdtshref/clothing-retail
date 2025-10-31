export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import POSHistoryPage from '@/components/pos/POSHistoryPage';

export default async function POSHistory() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/pos/history');
  return <POSHistoryPage />;
}


