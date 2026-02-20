export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';
import Company from '@/models/company';
import Variant from '@/models/variant';

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
  code: z.union([z.string().max(120).trim(), z.null()]).optional(),
  // Used to generate localCode; persisted on the product.
  costUSD: z.preprocess((v) => {
    // Prevent blank/whitespace from coercing to 0
    if (v === null || typeof v === 'undefined') return v;
    if (typeof v === 'string' && v.trim() === '') return undefined;
    return v;
  }, z.coerce.number().int().min(0).max(9999)),
  // Used only to generate localCode; not persisted.
  companyIds: z.array(z.string().min(1)).optional().default([]),
  basePrice: z.number().nonnegative().default(0),
  status: z.enum(['active', 'archived']).optional().default('active'),
  image: ImageSchema,
});

function formatCostPart(costUSD) {
  // costUSD validated as int 0..9999; no leading zeros
  return String(costUSD);
}

function normalizeCompanyLabel(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

async function getCompanyPrefix(companyIds) {
  const ids = [];
  const seen = new Set();
  for (const raw of companyIds || []) {
    const id = String(raw || '').trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (ids.length === 0) return '';

  const companies = await Company.find({ _id: { $in: ids } }, { name: 1 }).lean().exec();
  const nameById = new Map(
    companies.map((c) => [String(c._id), normalizeCompanyLabel(c?.name || '')]),
  );

  const names = ids.map((id) => nameById.get(id)).filter(Boolean);
  if (names.length !== ids.length) {
    const err = new Error('One or more companyIds do not exist');
    err.status = 400;
    throw err;
  }

  return `${names.join(' ')} `;
}

async function generateLocalCode(costUSD, companyIds = []) {
  const prefix = await getCompanyPrefix(companyIds);
  const c = formatCostPart(costUSD);
  let n = await Product.countDocuments().exec();
  for (let i = 0; i < 5; i++) {
    n += 1;
    const candidate = `${prefix}${c}${String(n).padStart(5, '0')}`;

    const exists = await Product.exists({ $or: [{ localCode: candidate }, { code: candidate }] });
    if (!exists) return candidate;
  }
  return `${prefix}${c}${String(n + 1).padStart(5, '0')}`;
}

export async function POST(req) {
  try {
    // AuthN guard
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
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

    const rawCode = parsed.data.code;
    const userCode = typeof rawCode === 'string' ? rawCode.trim() : '';
    const { costUSD, basePrice, status, image, companyIds } = parsed.data;

    await connectToDB();

    // Generate localCode ([COMP1 COMP2 ]CCXXXXX) and create product
    let localCode = await generateLocalCode(costUSD, companyIds);
    const code = userCode || localCode;

    // Optional: pre-check to provide cleaner 409 without stack trace (only for user-provided codes)
    if (userCode) {
      const exists = await Product.findOne({ code: userCode }).lean().exec();
      if (exists) {
        return NextResponse.json(
          { error: 'Conflict', message: `Product with code "${userCode}" already exists.` },
          { status: 409 },
        );
      }
    }
    let doc;
    try {
      doc = await Product.create({
        code,
        localCode,
        costUSD,
        basePrice,
        status,
        image: image || undefined,
      });
    } catch (e) {
      // In rare case of duplicate localCode, retry once
      if (e?.code === 11000 && e?.keyPattern?.localCode) {
        localCode = await generateLocalCode(costUSD, companyIds);
        doc = await Product.create({
          code,
          localCode,
          costUSD,
          basePrice,
          status,
          image: image || undefined,
        });
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
          costUSD: doc.costUSD ?? costUSD,
          basePrice: doc.basePrice ?? 0,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err?.status === 400) {
      return NextResponse.json(
        { error: 'ValidationError', message: err?.message || 'Invalid input' },
        { status: 400 },
      );
    }
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return noStoreJson(
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
      costUSD: doc.costUSD ?? 0,
      basePrice: doc.basePrice ?? 0,
      status: doc.status,
      image: doc.image || undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      ...(withCounts ? { variantCount: doc.variantCount ?? 0 } : {}),
    }));

    return noStoreJson({
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
    return noStoreJson(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
