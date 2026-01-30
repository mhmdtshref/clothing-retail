export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';

export async function GET(_req, context) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = await context.params;
  const { productId } = params || {};
  if (!productId || !mongoose.isValidObjectId(productId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    await connectToDB();
    const doc = await Product.findById(productId, {
      code: 1,
      localCode: 1,
      basePrice: 1,
      status: 1,
      image: 1,
      createdAt: 1,
      updatedAt: 1,
    }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ ok: true, product: { ...doc, _id: String(doc._id) } });
  } catch (e) {
    return NextResponse.json(
      { error: 'InternalServerError', message: e?.message || String(e) },
      { status: 500 },
    );
  }
}

const ImageSchema = z
  .object({
    url: z.string().url(),
    key: z.string().min(1),
    width: z.number().int().nonnegative().optional().default(0),
    height: z.number().int().nonnegative().optional().default(0),
    contentType: z.string().regex(/^image\//),
  })
  .nullable()
  .optional();

const PatchSchema = z.object({
  code: z.union([z.string().max(120).trim(), z.null()]).optional(),
  basePrice: z.number().nonnegative().optional(),
  status: z.enum(['active', 'archived']).optional(),
  image: ImageSchema,
});

export async function PATCH(req, context) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = await context.params;
  const { productId } = params || {};
  if (!productId || !mongoose.isValidObjectId(productId))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let input;
  try {
    const json = await req.json();
    input = PatchSchema.parse(json);
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid body' },
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    let desiredCode;
    if (typeof input.code !== 'undefined') {
      if (input.code === null || String(input.code).trim() === '') {
        const cur = await Product.findById(productId, { localCode: 1 }).lean();
        if (!cur) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        desiredCode = String(cur.localCode || '').trim();
      } else {
        desiredCode = String(input.code).trim();
      }
    }

    // If code will change, ensure uniqueness
    if (typeof desiredCode !== 'undefined') {
      const exists = await Product.findOne({ _id: { $ne: productId }, code: desiredCode }).lean();
      if (exists) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Product code must be unique.' },
          { status: 409 },
        );
      }
    }

    const update = {};
    if (typeof desiredCode !== 'undefined') update.code = desiredCode;
    if (typeof input.basePrice !== 'undefined') update.basePrice = input.basePrice;
    if (typeof input.status !== 'undefined') update.status = input.status;
    if (typeof input.image !== 'undefined') {
      if (input.image === null) update.$unset = { ...(update.$unset || {}), image: 1 };
      else update.image = input.image;
    }

    const doc = await Product.findByIdAndUpdate(productId, update, {
      new: true,
      projection: {
        code: 1,
        localCode: 1,
        basePrice: 1,
        status: 1,
        image: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ ok: true, product: { ...doc, _id: String(doc._id) } });
  } catch (e) {
    return NextResponse.json(
      { error: 'InternalServerError', message: e?.message || String(e) },
      { status: 500 },
    );
  }
}
