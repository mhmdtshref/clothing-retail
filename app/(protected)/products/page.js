export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProductsGrid from '@/components/products/ProductsGrid';
import Link from 'next/link';
import { Stack, Button } from '@mui/material';

export default async function ProductsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/products');

  return (
    <div style={{ padding: 16 }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Link href="/products/new" style={{ textDecoration: 'none' }}>
          <Button variant="contained">New Product</Button>
        </Link>
      </Stack>
      <ProductsGrid />
    </div>
  );
}
