export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Variant from '@/models/variant';
import Company from '@/models/company';
import VariantSize from '@/models/variantSize';
import VariantColor from '@/models/variantColor';
import { pickLocalizedName } from '@/lib/i18n/name';
import { normalizeLocale } from '@/lib/i18n/config';

function noStoreJson(body, init) {
  const res = NextResponse.json(body, init);
  // Prevent browser/proxy/CDN caching for authenticated, rapidly-changing data.
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  // Avoid shared caches mixing responses across sessions.
  res.headers.append('Vary', 'Cookie');
  return res;
}

export async function GET(req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

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
      {
        $addFields: {
          sizePriority: { $ifNull: [{ $arrayElemAt: ['$sizeDoc.priority', 0] }, 1] },
        },
      },
      { $project: { company: 0, sizeDoc: 0, colorDoc: 0 } },
      { $sort: { 'colorName.en': 1, sizePriority: 1, _id: 1 } },
    ]);

    return noStoreJson({
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
        sizePriority: typeof v.sizePriority === 'number' ? v.sizePriority : 1,
        qty: v.qty ?? 0,
      })),
    });
  } catch (err) {
    return noStoreJson(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
