export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';

const ProductCreateSchema = z.object({
  code: z.string().min(1, 'code is required').max(120).trim(),
  name: z.string().max(200).trim().optional().default(''),
  basePrice: z.number().nonnegative().default(0),
  status: z.enum(['active', 'archived']).optional().default('active'),
});

export async function POST(req) {
  try {
    // AuthN guard
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ProductCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ValidationError', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { code, name, basePrice, status } = parsed.data;

    await connectToDB();

    // Optional: pre-check to provide cleaner 409 without stack trace
    const exists = await Product.findOne({ code }).lean().exec();
    if (exists) {
      return NextResponse.json(
        { error: 'Conflict', message: `Product with code "${code}" already exists.` },
        { status: 409 },
      );
    }

    const doc = await Product.create({ code, name, basePrice, status });
    // Normalize output
    return NextResponse.json(
      {
        ok: true,
        product: {
          _id: doc._id,
          code: doc.code,
          name: doc.name ?? '',
          basePrice: doc.basePrice ?? 0,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    // Handle Mongo duplicate key just in case of race
    if (err?.code === 11000 && err?.keyPattern?.code) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Product code must be unique.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}


