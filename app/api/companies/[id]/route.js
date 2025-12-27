import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Company from '@/models/company';
import { CompanyUpdateSchema } from '@/lib/validators/company';
import { normalizeCompanyName } from '@/lib/company-name';

export async function PATCH(req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  if (!id || !mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let input;
  try {
    const body = await req.json();
    const parsed = CompanyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    input = parsed.data;
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const update = {};
  if (typeof input.name !== 'undefined') {
    update.name = input.name;
    update.nameKey = normalizeCompanyName(input.name);
  }

  try {
    await connectToDB();

    if (typeof update.name !== 'undefined') {
      const existing = await Company.findOne({ _id: { $ne: id }, nameKey: update.nameKey }).lean().exec();
      const conflict =
        Boolean(existing) ||
        (await Company.find({ _id: { $ne: id } }, { name: 1 })
          .lean()
          .exec())
          .some((c) => normalizeCompanyName(c?.name || '') === update.nameKey);

      if (conflict) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Company name must be unique.' },
          { status: 409 },
        );
      }
    }

    const doc = await Company.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
      projection: { name: 1, createdAt: 1, updatedAt: 1 },
    }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    return NextResponse.json({ ok: true, company: { ...doc, _id: doc._id } });
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


