import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const CashMovementSchema = new Schema(
  {
    sessionId: { type: Types.ObjectId, ref: 'CashboxSession', required: true, index: true },
    at: { type: Date, default: () => new Date(), index: true },
    amount: { type: Number, required: true, min: 0 },
    direction: { type: String, enum: ['in', 'out'], required: true, index: true },
    source: { type: String, enum: ['sale', 'return', 'payment', 'adjustment'], required: true, index: true },
    method: { type: String, default: 'cash' },
    receiptId: { type: Types.ObjectId, ref: 'Receipt' },
    note: { type: String },
    userId: { type: String }, // Clerk userId
  },
  { timestamps: true },
);

CashMovementSchema.index({ sessionId: 1, at: 1 });

export default mongoose.models.CashMovement || mongoose.model('CashMovement', CashMovementSchema);


