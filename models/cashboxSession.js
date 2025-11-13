import mongoose from 'mongoose';
const { Schema } = mongoose;

const CashboxSessionSchema = new Schema(
  {
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },

    openingAmount: { type: Number, required: true, min: 0 },
    openedAt: { type: Date, default: () => new Date() },
    openedBy: { type: String }, // Clerk userId

    closedAt: { type: Date },
    closedBy: { type: String }, // Clerk userId
    closeNote: { type: String },

    // At closing time
    countedAmount: { type: Number, default: 0 },
    variance: { type: Number, default: 0 }, // counted - expected

    // Aggregated totals (can be recomputed; stored for quick access on close)
    totals: {
      cashIn: { type: Number, default: 0 },
      cashOut: { type: Number, default: 0 },
      bySource: {
        sale: { type: Number, default: 0 }, // in
        payment: { type: Number, default: 0 }, // in
        return: { type: Number, default: 0 }, // out
        adjustmentIn: { type: Number, default: 0 },
        adjustmentOut: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true },
);

CashboxSessionSchema.index({ status: 1, openedAt: -1 });

export default mongoose.models.CashboxSession || mongoose.model('CashboxSession', CashboxSessionSchema);


