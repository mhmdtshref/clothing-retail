export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Expense from '@/models/expense';
import ExpenseCategory from '@/models/expense-category';
import { ExpenseUpdateSchema } from '@/lib/validators/expense';

export async function GET(_req, context) {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await connectToDB();
    const doc = await Expense.findById(id).lean().exec();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const cat = await ExpenseCategory.findById(doc.categoryId, { name: 1 }).lean().exec();

    return NextResponse.json({
      ok: true,
      expense: {
        _id: doc._id,
        date: doc.date,
        categoryId: doc.categoryId,
        categoryName: cat?.name || '',
        amount: doc.amount,
        vendor: doc.vendor || '',
        note: doc.note || '',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
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
    return NextResponse.json({ error: 'ValidationError', message: e?.message || 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ExpenseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ValidationError', issues: parsed.error.flatten?.() || parsed.error }, { status: 400 });
  }

  const update = { ...parsed.data };
  if (update.categoryId && !mongoose.isValidObjectId(update.categoryId)) {
    return NextResponse.json({ error: 'ValidationError', message: 'Invalid categoryId' }, { status: 400 });
  }

  try {
    await connectToDB();
    if (update.categoryId) {
      const exists = await ExpenseCategory.findById(update.categoryId).lean().exec();
      if (!exists) {
        return NextResponse.json(
          { error: 'ValidationError', message: 'Category not found' },
          { status: 400 },
        );
      }
    }

    const doc = await Expense.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const cat = await ExpenseCategory.findById(doc.categoryId, { name: 1 }).lean().exec();

    return NextResponse.json({
      ok: true,
      expense: {
        _id: doc._id,
        date: doc.date,
        categoryId: doc.categoryId,
        categoryName: cat?.name || '',
        amount: doc.amount,
        vendor: doc.vendor || '',
        note: doc.note || '',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
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
    const doc = await Expense.findByIdAndDelete(id).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


