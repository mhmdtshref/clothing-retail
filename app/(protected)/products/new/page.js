export const runtime = 'nodejs';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import VariantSize from '@/models/variantSize';
import VariantColor from '@/models/variantColor';
import VariantSizeGroup from '@/models/variantSizeGroup';
import CreateProductForm from '@/components/products/CreateProductForm';

export default async function NewProductPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?redirect_url=/products/new');

  await connectToDB();
  const companies = await Company.find({}, { name: 1 }).sort({ name: 1 }).lean();
  const sizes = await VariantSize.find({}, { name: 1, nameKey: 1, priority: 1 })
    .sort({ priority: 1, nameKey: 1 })
    .lean();
  const colors = await VariantColor.find({}, { name: 1, nameKey: 1 }).sort({ nameKey: 1 }).lean();
  const sizeGroups = await VariantSizeGroup.find({}, { name: 1, nameKey: 1, sizeIds: 1 })
    .sort({ nameKey: 1 })
    .lean();

  return (
    <CreateProductForm
      companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
      variantSizes={sizes.map((s) => ({
        _id: String(s._id),
        name: s.name,
        priority: typeof s.priority === 'number' ? s.priority : 1,
      }))}
      variantColors={colors.map((c) => ({ _id: String(c._id), name: c.name }))}
      sizeGroups={sizeGroups.map((g) => ({
        _id: String(g._id),
        name: g.name,
        sizeIds: (g.sizeIds || []).map((x) => String(x)),
      }))}
    />
  );
}
