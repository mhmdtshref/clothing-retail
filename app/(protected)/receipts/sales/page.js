export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import SalesReceiptsPage from '@/components/receipts/SalesReceiptsPage';

export default async function SalesReceiptsRoutePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/receipts/sales');
  return <SalesReceiptsPage />;
}

