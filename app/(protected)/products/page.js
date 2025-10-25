export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProductsListPage from '@/components/products/ProductsListPage';

export default async function ProductsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/products');

  return <ProductsListPage />;
}


