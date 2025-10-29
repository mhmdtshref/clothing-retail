export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';
import Variant from '@/models/variant';
import Company from '@/models/company';
import Receipt from '@/models/receipt';

function escapeRx(s = '') {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '20')));
  const skip = (page - 1) * limit;

  try {
    await connectToDB();

    const rx = q ? new RegExp(escapeRx(q), 'i') : null;

    const pipeline = [
      // Annotate product match by code when q provided
      ...(q
        ? [
            {
              $addFields: {
                matchedByCode: { $regexMatch: { input: '$code', regex: rx } },
              },
            },
          ]
        : [{ $addFields: { matchedByCode: false } }]),

      // Join variants for each product with company + on-hand qty
      {
        $lookup: {
          from: Variant.collection.name,
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$productId', '$$pid'] } } },
            {
              $lookup: {
                from: Company.collection.name,
                localField: 'companyId',
                foreignField: '_id',
                as: 'company',
              },
            },
            {
              $addFields: {
                companyName: { $ifNull: [{ $arrayElemAt: ['$company.name', 0] }, ''] },
                companyObj: { $arrayElemAt: ['$company', 0] },
              },
            },
            { $project: { company: 0 } },
            // Compute on-hand qty from receipts: purchases (+) - sales (-)
            {
              $lookup: {
                from: Receipt.collection.name,
                let: { vid: '$_id' },
                pipeline: [
                  { $unwind: '$items' },
                  { $match: { $expr: { $eq: ['$items.variantId', '$$vid'] } } },
                  { $group: { _id: '$type', qty: { $sum: '$items.qty' } } },
                  {
                    $group: {
                      _id: null,
                      purchased: {
                        $sum: {
                          $cond: [{ $in: ['$_id', ['purchase', 'sale_return']] }, '$qty', 0],
                        },
                      },
                      sold: { $sum: { $cond: [{ $eq: ['$_id', 'sale'] }, '$qty', 0] } },
                    },
                  },
                  { $project: { _id: 0, onHand: { $subtract: ['$purchased', '$sold'] } } },
                ],
                as: 'inv',
              },
            },
            { $addFields: { qty: { $ifNull: [{ $arrayElemAt: ['$inv.onHand', 0] }, 0] } } },
            { $project: { inv: 0 } },
          ],
          as: 'variants',
        },
      },

      // Mark if any variant's company name matches when q provided
      ...(q
        ? [
            {
              $addFields: {
                matchedByCompany: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$variants',
                          as: 'v',
                          cond: { $regexMatch: { input: '$$v.companyName', regex: rx } },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          ]
        : [{ $addFields: { matchedByCompany: false } }]),

      // Apply match only when q present
      ...(q ? [{ $match: { $or: [{ matchedByCode: true }, { matchedByCompany: true }] } }] : []),

      { $sort: { code: 1, _id: 1 } },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
                status: 1,
                variants: {
                  $map: {
                    input: '$variants',
                    as: 'v',
                    in: {
                      _id: '$$v._id',
                      size: '$$v.size',
                      color: '$$v.color',
                      company: { _id: '$$v.companyObj._id', name: '$$v.companyName' },
                      qty: '$$v.qty',
                    },
                  },
                },
              },
            },
          ],
          total: [{ $count: 'n' }],
        },
      },
      { $project: { items: 1, total: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] } } },
    ];

    const agg = await Product.aggregate(pipeline).allowDiskUse(true);
    const total = agg?.[0]?.total || 0;
    const items = agg?.[0]?.items || [];

    return NextResponse.json({
      ok: true,
      items,
      meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
