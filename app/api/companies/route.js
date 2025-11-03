export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import { CompanyCreateSchema } from '@/lib/validators/company';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDB();
    const items = await Company.find({}, { name: 1, createdAt: 1, updatedAt: 1 })
      .sort({ name: 1 })
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
    const parsed = CompanyCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const { name } = parsed.data;

    await connectToDB();

    const existing = await Company.findOne({ name }).lean().exec();
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Company name already exists.' },
        { status: 409 },
      );
    }

    const doc = await Company.create({ name });
    return NextResponse.json(
      {
        ok: true,
        company: {
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


