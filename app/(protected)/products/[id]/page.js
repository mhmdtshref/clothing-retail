export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProductDetailsPage from '@/components/products/ProductDetailsPage';

export default async function ProductDetails({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/products/${id}`);
  return <ProductDetailsPage productId={id} />;
}


