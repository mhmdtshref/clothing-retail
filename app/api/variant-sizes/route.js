export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import VariantSize from '@/models/variantSize';
import { VariantSizeCreateSchema } from '@/lib/validators/variant-size';
import { normalizeCompanyName } from '@/lib/company-name';

export async function GET() {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDB();
    const items = await VariantSize.find({}, { name: 1, priority: 1, createdAt: 1, updatedAt: 1 })
      .sort({ priority: 1, nameKey: 1 })
      .lean()
      .exec();

    return NextResponse.json({
      ok: true,
      items: items.map((s) => ({
        _id: s._id,
        name: s.name,
        priority: typeof s.priority === 'number' ? s.priority : 1,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
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
    const parsed = VariantSizeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const name = parsed.data.name;
    const priority = typeof parsed.data.priority === 'number' ? parsed.data.priority : 1;
    const nameKey = normalizeCompanyName(name?.en || '');

    await connectToDB();

    const existing = await VariantSize.findOne({ nameKey }).lean().exec();
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Size name must be unique.' },
        { status: 409 },
      );
    }

    const doc = await VariantSize.create({ name, nameKey, priority });
    return NextResponse.json(
      {
        ok: true,
        size: {
          _id: doc._id,
          name: doc.name,
          priority: typeof doc.priority === 'number' ? doc.priority : 1,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Size name must be unique.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
