import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';
import Company from '@/models/company';
import Variant from '@/models/variant';

function normStr(s) {
  return String(s ?? '').trim();
}

export async function generateVariantsForProduct({
  productId,
  sizes = [],
  colors = [],
  companyIds = [],
}) {
  await connectToDB();

  // Validate product exists
  const product = await Product.findById(productId).lean().exec();
  if (!product) throw new Error('Product not found');

  // Normalize and dedupe inputs
  const S = [...new Set(sizes.map(normStr).filter(Boolean))];
  const C = [...new Set(colors.map(normStr).filter(Boolean))];
  const K = [...new Set(companyIds.map((id) => String(id)).filter(Boolean))];

  if (S.length === 0) throw new Error('sizes[] required');
  if (C.length === 0) throw new Error('colors[] required');
  if (K.length === 0) throw new Error('companyIds[] required');

  // (Optional) verify companies exist to avoid dangling refs
  const companyCount = await Company.countDocuments({ _id: { $in: K } });
  if (companyCount !== K.length) {
    throw new Error('One or more companyIds do not exist');
  }

  // Build the cartesian product
  const docs = [];
  for (const size of S) {
    for (const color of C) {
      for (const companyId of K) {
        docs.push({
          productId: new mongoose.Types.ObjectId(productId),
          companyId: new mongoose.Types.ObjectId(companyId),
          size,
          color,
        });
      }
    }
  }

  // Insert missing variants using bulkWrite + upsert
  // Because of the unique compound index, duplicates will be ignored via upsert filter.
  const ops = docs.map((d) => ({
    updateOne: {
      filter: {
        productId: d.productId,
        size: d.size,
        color: d.color,
        companyId: d.companyId,
      },
      update: { $setOnInsert: d },
      upsert: true,
    },
  }));

  const res = await Variant.bulkWrite(ops, { ordered: false });
  const upserts =
    (res.upsertedCount ?? 0) ||
    (Array.isArray(res.upsertedIds) ? res.upsertedIds.length : Object.keys(res.upsertedIds || {}).length);

  return {
    requested: docs.length,
    created: upserts,
    skippedExisting: docs.length - upserts,
  };
}


