export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import VariantColor from '@/models/variantColor';
import { VariantColorCreateSchema } from '@/lib/validators/variant-color';
import { normalizeCompanyName } from '@/lib/company-name';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDB();
    const items = await VariantColor.find({}, { name: 1, createdAt: 1, updatedAt: 1 })
      .sort({ nameKey: 1 })
      .lean()
      .exec();

    return NextResponse.json({
      ok: true,
      items: items.map((c) => ({
        _id: c._id,
        name: c.name,
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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = VariantColorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const name = parsed.data.name;
    const nameKey = normalizeCompanyName(name?.en || '');

    await connectToDB();

    const existing = await VariantColor.findOne({ nameKey }).lean().exec();
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Color name must be unique.' },
        { status: 409 },
      );
    }

    const doc = await VariantColor.create({ name, nameKey });
    return NextResponse.json(
      {
        ok: true,
        color: {
          _id: doc._id,
          name: doc.name,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Color name must be unique.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}

