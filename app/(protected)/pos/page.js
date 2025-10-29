export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import POSShell from '@/components/pos/POSShell';

export default async function POSPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/pos');
  return <POSShell />;
}
