export const runtime = 'nodejs';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import ExpenseCategory from '@/models/expense-category';
import { ExpenseCategoryCreateSchema } from '@/lib/validators/expense-category';
import { makeExpenseCategorySlug } from '@/lib/slug/expenseCategorySlug';

async function ensureUniqueSlug({ name }) {
  const base = makeExpenseCategorySlug(name);
  let slug = base;
  let i = 1;

  // Try a few deterministic suffixes before falling back to a random suffix.
  // This avoids breaking on transliteration collisions (e.g. different Arabic letters mapping to same ASCII).
  // Note: unique index at DB level is still the final guard against races.
  while (await ExpenseCategory.exists({ slug })) {
    i += 1;
    if (i <= 20) {
      const suffix = `-${i}`;
      slug = `${base.slice(0, Math.max(1, 140 - suffix.length))}${suffix}`;
      continue;
    }

    const rand = crypto.randomUUID().split('-')[0]; // 8 chars
    const suffix = `-${rand}`;
    slug = `${base.slice(0, Math.max(1, 140 - suffix.length))}${suffix}`;
  }

  return slug;
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
      .sort({ name: 1 })
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

    await connectToDB();

    const existingName = await ExpenseCategory.findOne({ name }).lean().exec();
    if (existingName) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Category name already exists.' },
        { status: 409 },
      );
    }

    const slug = await ensureUniqueSlug({ name });

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


