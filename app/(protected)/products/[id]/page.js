export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import VariantSize from '@/models/variantSize';
import VariantColor from '@/models/variantColor';
import ProductDetailsPage from '@/components/products/ProductDetailsPage';

export default async function ProductDetails({ params }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/products/${id}`);

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();
  const sizes = await VariantSize.find({}, { name: 1, nameKey: 1 }).sort({ nameKey: 1 }).lean();
  const colors = await VariantColor.find({}, { name: 1, nameKey: 1 }).sort({ nameKey: 1 }).lean();

  return (
    <ProductDetailsPage
      productId={id}
      companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
      variantSizes={sizes.map((s) => ({ _id: String(s._id), name: s.name }))}
      variantColors={colors.map((c) => ({ _id: String(c._id), name: c.name }))}
    />
  );
}


