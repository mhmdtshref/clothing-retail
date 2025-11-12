export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProductsGrid from '@/components/products/ProductsGrid';
import ProductsHeaderActions from '@/components/products/ProductsHeaderActions';

export default async function ProductsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/products');

  return (
    <div style={{ padding: 16 }}>
      <ProductsHeaderActions />
      <ProductsGrid />
    </div>
  );
}
