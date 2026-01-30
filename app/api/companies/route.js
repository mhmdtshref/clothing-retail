export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import { CompanyCreateSchema } from '@/lib/validators/company';
import { normalizeCompanyName } from '@/lib/company-name';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDB();
    const items = await Company.find({}, { name: 1, store: 1, createdAt: 1, updatedAt: 1 })
      .sort({ name: 1 })
      .lean()
      .exec();

    return NextResponse.json({
      ok: true,
      items: items.map((c) => ({
        _id: c._id,
        name: c.name,
        store: c.store || 'Lariche',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CompanyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const { name, store } = parsed.data;
    const nameKey = normalizeCompanyName(name);

    await connectToDB();

    const existing = await Company.findOne({ nameKey }).lean().exec();
    const conflict =
      Boolean(existing) ||
      (await Company.find({}, { name: 1 }).lean().exec()).some(
        (c) => normalizeCompanyName(c?.name || '') === nameKey,
      );

    if (conflict) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Company name must be unique.' },
        { status: 409 },
      );
    }

    const doc = await Company.create({ name, nameKey, store });
    return NextResponse.json(
      {
        ok: true,
        company: {
          _id: doc._id,
          name: doc.name,
          store: doc.store || 'Lariche',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Company name must be unique.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
