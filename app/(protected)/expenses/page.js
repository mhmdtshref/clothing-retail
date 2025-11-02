export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ExpensesPage from '@/components/expenses/ExpensesPage';

export default async function Expenses() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/expenses');
  return <ExpensesPage />;
}


