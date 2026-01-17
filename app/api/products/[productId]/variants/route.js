export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Variant from '@/models/variant';
import Company from '@/models/company';
import VariantSize from '@/models/variantSize';
import VariantColor from '@/models/variantColor';
import { pickLocalizedName } from '@/lib/i18n/name';
import { normalizeLocale } from '@/lib/i18n/config';

export async function GET(req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDB();
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId') || null;
    const { productId } = await context.params;

    const filter = { productId: new mongoose.Types.ObjectId(productId) };
    if (companyId) filter.companyId = new mongoose.Types.ObjectId(companyId);

    const locale = normalizeLocale(req?.cookies?.get?.('lang')?.value);

    const variants = await Variant.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: Company.collection.name,
          localField: 'companyId',
          foreignField: '_id',
          as: 'company',
        },
      },
      {
        $lookup: {
          from: VariantSize.collection.name,
          localField: 'sizeId',
          foreignField: '_id',
          as: 'sizeDoc',
        },
      },
      {
        $lookup: {
          from: VariantColor.collection.name,
          localField: 'colorId',
          foreignField: '_id',
          as: 'colorDoc',
        },
      },
      { $addFields: { companyName: { $ifNull: [{ $arrayElemAt: ['$company.name', 0] }, ''] } } },
      {
        $addFields: {
          sizeName: { $ifNull: [{ $arrayElemAt: ['$sizeDoc.name', 0] }, {}] },
          colorName: { $ifNull: [{ $arrayElemAt: ['$colorDoc.name', 0] }, {}] },
        },
      },
      { $project: { company: 0, sizeDoc: 0, colorDoc: 0 } },
      { $sort: { 'sizeName.en': 1, 'colorName.en': 1 } },
    ]);

    return NextResponse.json({
      ok: true,
      items: variants.map((v) => ({
        _id: v._id,
        productId: v.productId,
        companyId: v.companyId,
        companyName: v.companyName,
        sizeId: v.sizeId,
        colorId: v.colorId,
        size: pickLocalizedName(v.sizeName, locale),
        color: pickLocalizedName(v.colorName, locale),
        qty: v.qty ?? 0,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
