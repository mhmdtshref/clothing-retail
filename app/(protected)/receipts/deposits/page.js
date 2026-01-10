export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DepositReceiptsPage from '@/components/pos/DepositReceiptsPage';

export default async function ReceiptsDepositReceiptsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/receipts/deposits');
  return <DepositReceiptsPage />;
}

