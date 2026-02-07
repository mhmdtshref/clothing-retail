export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import VariantSizeGroup from '@/models/variantSizeGroup';
import { VariantSizeGroupCreateSchema } from '@/lib/validators/variant-size-group';
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

export async function GET() {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDB();
    const items = await VariantSizeGroup.find(
      {},
      { name: 1, sizeIds: 1, createdAt: 1, updatedAt: 1, nameKey: 1 },
    )
      .sort({ nameKey: 1 })
      .lean()
      .exec();

    return NextResponse.json({
      ok: true,
      items: items.map((g) => ({
        _id: g._id,
        name: g.name,
        sizeIds: (g.sizeIds || []).map((x) => String(x)),
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const authSession = await auth.api.getSession({ headers: await headers() });
    if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = VariantSizeGroupCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const name = String(parsed.data.name || '').trim();
    const sizeIds = uniqueStrings(parsed.data.sizeIds);
    if (sizeIds.length < 1) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Please provide at least one size.' },
        { status: 400 },
      );
    }
    const invalidId = sizeIds.find((id) => !mongoose.isValidObjectId(id));
    if (invalidId) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Invalid size id.' },
        { status: 400 },
      );
    }

    const nameKey = normalizeCompanyName(name);
    if (!nameKey) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Name is required.' },
        { status: 400 },
      );
    }

    await connectToDB();

    const existing = await VariantSizeGroup.findOne({ nameKey }).lean().exec();
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Size group name must be unique.' },
        { status: 409 },
      );
    }

    const doc = await VariantSizeGroup.create({ name, nameKey, sizeIds });
    return NextResponse.json(
      {
        ok: true,
        group: {
          _id: doc._id,
          name: doc.name,
          sizeIds: (doc.sizeIds || []).map((x) => String(x)),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
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
