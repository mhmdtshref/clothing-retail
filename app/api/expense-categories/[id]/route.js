export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import ExpenseCategory from '@/models/expense-category';
import { ExpenseCategoryUpdateSchema } from '@/lib/validators/expense-category';

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function PATCH(req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'ValidationError', message: e?.message || 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ExpenseCategoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ValidationError', issues: parsed.error.flatten?.() || parsed.error }, { status: 400 });
  }

  const update = { ...parsed.data };
  if (typeof update.name === 'string' && update.name.trim().length > 0) {
    update.slug = slugify(update.name);
  }

  try {
    await connectToDB();

    if (update.name || update.slug) {
      const conflict = await ExpenseCategory.findOne({
        _id: { $ne: id },
        $or: [
          ...(update.name ? [{ name: update.name }] : []),
          ...(update.slug ? [{ slug: update.slug }] : []),
        ],
      })
        .lean()
        .exec();
      if (conflict) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Category name already exists.' },
          { status: 409 },
        );
      }
    }

    const doc = await ExpenseCategory.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await connectToDB();
    const doc = await ExpenseCategory.findByIdAndUpdate(id, { active: false }, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


