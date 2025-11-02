export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Expense from '@/models/expense';
import ExpenseCategory from '@/models/expense-category';
import { ExpenseCreateSchema } from '@/lib/validators/expense';

const QuerySchema = z.object({
  categoryId: z.string().trim().optional().default(''),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  q: z.string().trim().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'ValidationError', issues: parsed.error.flatten?.() || parsed.error },
      { status: 400 },
    );
  }

  const { categoryId, start, end, q, page, limit } = parsed.data;

  const filter = {};
  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) {
      return NextResponse.json({ error: 'ValidationError', message: 'Invalid categoryId' }, { status: 400 });
    }
    filter.categoryId = new mongoose.Types.ObjectId(categoryId);
  }
  if (start || end) {
    filter.date = {};
    if (start) filter.date.$gte = new Date(start);
    if (end) filter.date.$lte = new Date(end);
  }
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ vendor: rx }, { note: rx }];
  }

  const skip = (page - 1) * limit;
  const sort = { date: -1, _id: -1 };

  try {
    await connectToDB();

    const pipeline = [
      { $match: filter },
      { $sort: sort },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: ExpenseCategory.collection.name,
                localField: 'categoryId',
                foreignField: '_id',
                as: 'cat',
              },
            },
            { $addFields: { categoryName: { $ifNull: [{ $arrayElemAt: ['$cat.name', 0] }, ''] } } },
            { $project: { cat: 0 } },
          ],
          total: [{ $count: 'n' }],
          totalAmount: [
            { $group: { _id: null, s: { $sum: '$amount' } } },
            { $project: { _id: 0, s: 1 } },
          ],
        },
      },
      {
        $project: {
          items: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$total.n', 0] }, 0] },
          totalAmount: { $ifNull: [{ $arrayElemAt: ['$totalAmount.s', 0] }, 0] },
        },
      },
    ];

    const agg = await Expense.aggregate(pipeline).allowDiskUse(true);
    const { items, total, totalAmount } = agg[0] || { items: [], total: 0, totalAmount: 0 };

    return NextResponse.json({
      ok: true,
      items: items.map((e) => ({
        _id: e._id,
        date: e.date,
        categoryId: e.categoryId,
        categoryName: e.categoryName,
        amount: e.amount,
        vendor: e.vendor || '',
        note: e.note || '',
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      meta: { page, limit, total, totalAmount },
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
    const parsed = ExpenseCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }

    const { date, categoryId, amount, vendor = '', note = '' } = parsed.data;
    if (!mongoose.isValidObjectId(categoryId)) {
      return NextResponse.json({ error: 'ValidationError', message: 'Invalid categoryId' }, { status: 400 });
    }

    await connectToDB();
    const cat = await ExpenseCategory.findById(categoryId).lean().exec();
    if (!cat) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Category not found' },
        { status: 400 },
      );
    }

    const doc = await Expense.create({ date: new Date(date), categoryId, amount, vendor, note });
    return NextResponse.json(
      {
        ok: true,
        expense: {
          _id: doc._id,
          date: doc.date,
          categoryId: doc.categoryId,
          amount: doc.amount,
          vendor: doc.vendor || '',
          note: doc.note || '',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


