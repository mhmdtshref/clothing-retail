export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import VariantOptionsSettingsPage from '@/components/settings/VariantOptionsSettingsPage';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/settings');
  return <VariantOptionsSettingsPage />;
}

