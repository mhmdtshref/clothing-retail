export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ExpensesPage from '@/components/expenses/ExpensesPage';

export default async function Expenses() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/expenses');
  return <ExpensesPage />;
}
