import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Variant from '@/models/variant';

export async function getOnHandForVariant(variantId) {
  await connectToDB();
  const id = new mongoose.Types.ObjectId(variantId);
  const doc = await Variant.findById(id, { qty: 1 }).lean().exec();
  return Number(doc?.qty ?? 0);
}
