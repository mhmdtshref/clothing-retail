export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import CreateProductForm from '@/components/products/CreateProductForm';

export default async function NewProductPage() {
  const { userId } = auth();
  if (!userId) redirect('/sign-in?redirect_url=/products/new');

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();

  return (
    <CreateProductForm
      companies={companies.map(c => ({ _id: String(c._id), name: c.name }))}
    />
  );
}


