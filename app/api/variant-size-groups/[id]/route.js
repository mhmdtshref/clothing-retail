export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import VariantSizeGroup from '@/models/variantSizeGroup';
import { VariantSizeGroupUpdateSchema } from '@/lib/validators/variant-size-group';
import { normalizeCompanyName } from '@/lib/company-name';

function uniqueStrings(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr || []) {
    const s = String(v || '');
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export async function PATCH(req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let input;
  try {
    const body = await req.json();
    const parsed = VariantSizeGroupUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    input = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const update = {};
  if (typeof input.name !== 'undefined') {
    const name = String(input.name || '').trim();
    const nameKey = normalizeCompanyName(name);
    if (!nameKey) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Name is required.' },
        { status: 400 },
      );
    }
    update.name = name;
    update.nameKey = nameKey;
  }
  if (typeof input.sizeIds !== 'undefined') {
    const sizeIds = uniqueStrings(input.sizeIds);
    if (sizeIds.length < 1) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Please provide at least one size.' },
        { status: 400 },
      );
    }
    const invalidId = sizeIds.find((sid) => !mongoose.isValidObjectId(sid));
    if (invalidId) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Invalid size id.' },
        { status: 400 },
      );
    }
    update.sizeIds = sizeIds;
  }

  try {
    await connectToDB();

    if (typeof update.nameKey !== 'undefined') {
      const existing = await VariantSizeGroup.findOne({ _id: { $ne: id }, nameKey: update.nameKey })
        .lean()
        .exec();
      if (existing) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Size group name must be unique.' },
          { status: 409 },
        );
      }
    }

    const doc = await VariantSizeGroup.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
      projection: { name: 1, sizeIds: 1, createdAt: 1, updatedAt: 1 },
    }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      group: {
        ...doc,
        _id: doc._id,
        sizeIds: (doc.sizeIds || []).map((x) => String(x)),
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Size group name must be unique.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}

