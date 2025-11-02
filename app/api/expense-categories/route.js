export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import ExpenseCategory from '@/models/expense-category';
import { ExpenseCategoryCreateSchema } from '@/lib/validators/expense-category';

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const QuerySchema = z.object({
  includeInactive: z.union([z.literal('true'), z.literal('false')]).optional().default('false'),
});

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ValidationError', issues: parsed.error.flatten?.() || parsed.error }, { status: 400 });
  }

  const includeInactive = parsed.data.includeInactive === 'true';
  const filter = includeInactive ? {} : { active: true };

  try {
    await connectToDB();
    const items = await ExpenseCategory.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();

    return NextResponse.json({
      ok: true,
      items: items.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        active: c.active,
        sortOrder: c.sortOrder ?? 0,
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
    const parsed = ExpenseCategoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const { name, active = true, sortOrder = 0 } = parsed.data;
    const slug = slugify(name);

    await connectToDB();

    const existing = await ExpenseCategory.findOne({ $or: [{ name }, { slug }] }).lean().exec();
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Category name already exists.' },
        { status: 409 },
      );
    }

    const doc = await ExpenseCategory.create({ name, slug, active, sortOrder });
    return NextResponse.json(
      {
        ok: true,
        category: {
          _id: doc._id,
          name: doc.name,
          slug: doc.slug,
          active: doc.active,
          sortOrder: doc.sortOrder ?? 0,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Category name must be unique.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


