export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';
import Variant from '@/models/variant';

const ImageSchema = z
  .object({
    url: z.string().url(),
    key: z.string().min(1),
    width: z.number().int().nonnegative().optional().default(0),
    height: z.number().int().nonnegative().optional().default(0),
    contentType: z.string().regex(/^image\//),
  })
  .optional();

const ProductCreateSchema = z.object({
  code: z.string().min(1, 'code is required').max(120).trim(),
  basePrice: z.number().nonnegative().default(0),
  status: z.enum(['active', 'archived']).optional().default('active'),
  image: ImageSchema,
});

async function generateLocalCode() {
  const yy = String(new Date().getFullYear()).slice(-2);
  let n = await Product.countDocuments().exec();
  for (let i = 0; i < 5; i++) {
    n += 1;
    const candidate = `${yy}-${String(n).padStart(6, '0')}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Product.exists({ localCode: candidate });
    if (!exists) return candidate;
  }
  return `${yy}-${String(n + 1).padStart(6, '0')}`;
}

export async function POST(req) {
  try {
    // AuthN guard
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ProductCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const { code, basePrice, status, image } = parsed.data;

    await connectToDB();

    // Optional: pre-check to provide cleaner 409 without stack trace
    const exists = await Product.findOne({ code }).lean().exec();
    if (exists) {
      return NextResponse.json(
        { error: 'Conflict', message: `Product with code "${code}" already exists.` },
        { status: 409 },
      );
    }

    // Generate localCode (YY-XXXXXX) and create product
    let localCode = await generateLocalCode();
    let doc;
    try {
      doc = await Product.create({ code, localCode, basePrice, status, image: image || undefined });
    } catch (e) {
      // In rare case of duplicate localCode, retry once
      if (e?.code === 11000 && e?.keyPattern?.localCode) {
        localCode = await generateLocalCode();
        doc = await Product.create({ code, localCode, basePrice, status, image: image || undefined });
      } else {
        throw e;
      }
    }
    // Normalize output
    return NextResponse.json(
      {
        ok: true,
        product: {
          _id: doc._id,
          code: doc.code,
          localCode: doc.localCode,
          basePrice: doc.basePrice ?? 0,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    // Handle Mongo duplicate key just in case of race
    if (err?.code === 11000 && err?.keyPattern?.code) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Product code must be unique.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}

// Listing/query params schema
const QuerySchema = z.object({
  query: z.string().trim().optional().default(''),
  status: z.enum(['active', 'archived', 'all']).optional().default('active'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.enum(['createdAt', 'code', 'localCode']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  includeVariantCounts: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .default('true'),
});

export async function GET(req) {
  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'ValidationError', issues: parsed.error.flatten?.() || parsed.error },
      { status: 400 },
    );
  }

  const { query: q, status, page, limit, sort, order, includeVariantCounts } = parsed.data;

  const filter = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: rx }, { localCode: rx }];
  }
  if (status !== 'all') {
    filter.status = status;
  }

  const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;
  const withCounts = includeVariantCounts === 'true';

  try {
    await connectToDB();

    const pipeline = [
      { $match: filter },
      { $sort: sortObj },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            ...(withCounts
              ? [
                  {
                    $lookup: {
                      from: Variant.collection.name,
                      let: { pid: '$_id' },
                      pipeline: [
                        { $match: { $expr: { $eq: ['$productId', '$$pid'] } } },
                        { $count: 'n' },
                      ],
                      as: 'vc',
                    },
                  },
                  { $addFields: { variantCount: { $ifNull: [{ $first: '$vc.n' }, 0] } } },
                  { $project: { vc: 0 } },
                ]
              : []),
          ],
          total: [{ $count: 'n' }],
        },
      },
      { $project: { items: 1, total: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] } } },
    ];

    const agg = await Product.aggregate(pipeline).allowDiskUse(true);
    const { items, total } = agg[0] || { items: [], total: 0 };

    const payload = items.map((doc) => ({
      _id: doc._id,
      code: doc.code,
      localCode: doc.localCode,
      basePrice: doc.basePrice ?? 0,
      status: doc.status,
      image: doc.image || undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      ...(withCounts ? { variantCount: doc.variantCount ?? 0 } : {}),
    }));

    return NextResponse.json({
      ok: true,
      items: payload,
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        sort,
        order,
        status,
        query: q,
        includeVariantCounts: withCounts,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
