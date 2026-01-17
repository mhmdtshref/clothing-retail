export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProductsGrid from '@/components/products/ProductsGrid';
import ProductsHeaderActions from '@/components/products/ProductsHeaderActions';

export default async function ProductsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/products');

  return (
    <div style={{ padding: 16 }}>
      <ProductsHeaderActions />
      <ProductsGrid />
    </div>
  );
}
