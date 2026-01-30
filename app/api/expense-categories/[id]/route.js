export const runtime = 'nodejs';

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import ExpenseCategory from '@/models/expense-category';
import { ExpenseCategoryUpdateSchema } from '@/lib/validators/expense-category';
import { makeExpenseCategorySlug } from '@/lib/slug/expenseCategorySlug';

async function ensureUniqueSlugForUpdate({ name, excludeId }) {
  const base = makeExpenseCategorySlug(name);
  let slug = base;
  let i = 1;

  while (await ExpenseCategory.exists({ _id: { $ne: excludeId }, slug })) {
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

export async function PATCH(req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { error: 'ValidationError', message: e?.message || 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const parsed = ExpenseCategoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'ValidationError', issues: parsed.error.flatten?.() || parsed.error },
      { status: 400 },
    );
  }

  const update = { ...parsed.data };
  const nextName =
    typeof update.name === 'string' && update.name.trim().length > 0 ? update.name.trim() : null;

  try {
    await connectToDB();

    if (nextName) {
      const conflictName = await ExpenseCategory.findOne({ _id: { $ne: id }, name: nextName })
        .lean()
        .exec();
      if (conflictName) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Category name already exists.' },
          { status: 409 },
        );
      }

      update.name = nextName;
      update.slug = await ensureUniqueSlugForUpdate({ name: nextName, excludeId: id });
    }

    const doc = await ExpenseCategory.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    return NextResponse.json({
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
    });
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

export async function DELETE(_req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await connectToDB();
    const doc = await ExpenseCategory.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    ).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
