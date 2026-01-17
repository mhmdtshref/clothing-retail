export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import VariantColor from '@/models/variantColor';
import { VariantColorUpdateSchema } from '@/lib/validators/variant-color';
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
    const parsed = VariantColorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: z.treeifyError(parsed.error) },
        { status: 400 },
      );
    }
    input = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const update = {};
  if (typeof input.name !== 'undefined') {
    update.name = input.name;
    update.nameKey = normalizeCompanyName(input.name?.en || '');
  }

  try {
    await connectToDB();

    if (typeof update.nameKey !== 'undefined') {
      const existing = await VariantColor.findOne({ _id: { $ne: id }, nameKey: update.nameKey })
        .lean()
        .exec();
      if (existing) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Color name must be unique.' },
          { status: 409 },
        );
      }
    }

    const doc = await VariantColor.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
      projection: { name: 1, createdAt: 1, updatedAt: 1 },
    }).lean();
    if (!doc) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    return NextResponse.json({ ok: true, color: { ...doc, _id: doc._id } });
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

