import { connectToDB } from '@/lib/mongoose';
import Receipt from '@/models/receipt';

export async function ensureReceiptEditable(receiptId) {
  await connectToDB();
  const r = await Receipt.findById(receiptId).select({ status: 1 }).lean().exec();
  if (!r) {
    const err = new Error('Receipt not found');
    err.code = 'RECEIPT_NOT_FOUND';
    throw err;
  }
  if (r.status === 'completed') {
    const err = new Error('Receipt is completed and cannot be modified');
    err.code = 'RECEIPT_LOCKED';
    throw err;
  }
  return r.status;
}

const ALLOWED_NEXT = {
  ordered: new Set(['on_delivery', 'completed']),
  on_delivery: new Set(['payment_collected', 'completed']),
  payment_collected: new Set(['ready_to_receive']),
  ready_to_receive: new Set(['completed']),
  pending: new Set(['completed']),
  completed: new Set([]),
};

export function assertStatusTransition(current, next) {
  if (!next) {
    const err = new Error('Next status is required');
    err.code = 'STATUS_REQUIRED';
    throw err;
  }
  if (current === next) return;
  const ok = ALLOWED_NEXT[current]?.has(next);
  if (!ok) {
    const err = new Error(`Invalid status transition: ${current} → ${next}`);
    err.code = 'INVALID_STATUS_TRANSITION';
    throw err;
  }
}
