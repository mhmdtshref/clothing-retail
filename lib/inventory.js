import mongoose from 'mongoose';
import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';

export async function getOnHandForVariant(variantId) {
  await connectToDB();
  const id = new mongoose.Types.ObjectId(variantId);

  const result = await Receipt.aggregate([
    { $match: { 'items.variantId': id } },
    { $unwind: '$items' },
    { $match: { 'items.variantId': id } },
    {
      $group: {
        _id: '$type',
        qty: { $sum: '$items.qty' },
      },
    },
    {
      $group: {
        _id: null,
        purchased: { $sum: { $cond: [{ $in: ['$_id', ['purchase', 'sale_return']] }, '$qty', 0] } },
        sold: { $sum: { $cond: [{ $eq: ['$_id', 'sale'] }, '$qty', 0] } },
      },
    },
    { $project: { _id: 0, onHand: { $subtract: ['$purchased', '$sold'] } } },
  ]);

  return result?.[0]?.onHand ?? 0;
}


