export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import VariantOptionsSettingsPage from '@/components/settings/VariantOptionsSettingsPage';

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/settings');
  return <VariantOptionsSettingsPage />;
}

