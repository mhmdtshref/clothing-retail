import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Product from '@/models/product';
import Company from '@/models/company';
import Variant from '@/models/variant';
import VariantSize from '@/models/variantSize';
import VariantColor from '@/models/variantColor';

let didSyncVariantIndexes = false;

function normId(s) {
  return String(s ?? '').trim();
}

export async function generateVariantsForProduct({
  productId,
  sizeIds = [],
  colorIds = [],
  companyIds = [],
}) {
  await connectToDB();

  // IMPORTANT: during development, schema index changes don't automatically remove old MongoDB indexes.
  // If the old (productId,size,color,companyId) unique index still exists, inserts will collide because size/color
  // are now missing and treated as null/undefined. This results in partial generation or 11000 errors.
  // Sync once per process to keep this safe and fast.
  if (!didSyncVariantIndexes) {
    try {
      await Variant.syncIndexes();
    } finally {
      didSyncVariantIndexes = true;
    }
  }

  // Validate product exists
  const product = await Product.findById(productId).lean().exec();
  if (!product) throw new Error('Product not found');

  // Normalize and dedupe inputs
  const S = [...new Set(sizeIds.map(normId).filter(Boolean))];
  const C = [...new Set(colorIds.map(normId).filter(Boolean))];
  const K = [...new Set(companyIds.map((id) => String(id)).filter(Boolean))];

  if (S.length === 0) throw new Error('sizeIds[] required');
  if (C.length === 0) throw new Error('colorIds[] required');
  if (K.length === 0) throw new Error('companyIds[] required');

  // (Optional) verify companies exist to avoid dangling refs
  const companyCount = await Company.countDocuments({ _id: { $in: K } });
  if (companyCount !== K.length) {
    throw new Error('One or more companyIds do not exist');
  }

  const sizeCount = await VariantSize.countDocuments({ _id: { $in: S } });
  if (sizeCount !== S.length) {
    throw new Error('One or more sizeIds do not exist');
  }

  const colorCount = await VariantColor.countDocuments({ _id: { $in: C } });
  if (colorCount !== C.length) {
    throw new Error('One or more colorIds do not exist');
  }

  // Build the cartesian product
  const docs = [];
  for (const sizeId of S) {
    for (const colorId of C) {
      for (const companyId of K) {
        docs.push({
          productId: new mongoose.Types.ObjectId(productId),
          companyId: new mongoose.Types.ObjectId(companyId),
          sizeId: new mongoose.Types.ObjectId(sizeId),
          colorId: new mongoose.Types.ObjectId(colorId),
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
        sizeId: d.sizeId,
        colorId: d.colorId,
        companyId: d.companyId,
      },
      update: { $setOnInsert: { ...d, qty: 0 } },
      upsert: true,
    },
  }));

  const res = await Variant.bulkWrite(ops, { ordered: false });
  const upserts =
    (res.upsertedCount ?? 0) ||
    (Array.isArray(res.upsertedIds)
      ? res.upsertedIds.length
      : Object.keys(res.upsertedIds || {}).length);

  return {
    requested: docs.length,
    created: upserts,
    skippedExisting: docs.length - upserts,
  };
}
