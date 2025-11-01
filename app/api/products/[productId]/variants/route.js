export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Variant from '@/models/variant';
import Company from '@/models/company';

export async function GET(req, context) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectToDB();
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId') || null;
    const { productId } = await context.params;

    const filter = { productId: new mongoose.Types.ObjectId(productId) };
    if (companyId) filter.companyId = new mongoose.Types.ObjectId(companyId);

    const variants = await Variant.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: Company.collection.name,
          localField: 'companyId',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $addFields: { companyName: { $ifNull: [{ $arrayElemAt: ['$company.name', 0] }, ''] } } },
      { $project: { company: 0 } },
      { $sort: { size: 1, color: 1 } },
    ]);

    return NextResponse.json({
      ok: true,
      items: variants.map((v) => ({
        _id: v._id,
        productId: v.productId,
        companyId: v.companyId,
        companyName: v.companyName,
        size: v.size,
        color: v.color,
        qty: v.qty ?? 0,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'InternalServerError', message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
