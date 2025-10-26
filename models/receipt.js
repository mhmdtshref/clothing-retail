import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const DiscountSchema = new Schema({
  mode: { type: String, enum: ['amount', 'percent'], default: 'amount' },
  value: { type: Number, default: 0 }, // currency amount OR percent (0-100)
}, { _id: false });

const ReceiptItemSchema = new Schema({
  variantId: { type: Types.ObjectId, ref: 'Variant', required: true },
  qty: { type: Number, required: true, min: 1 },

  // Purchase vs Sale amounts
  unitCost: { type: Number, default: 0 },   // per-unit cost (purchase)
  unitPrice: { type: Number, default: 0 },  // per-unit price (sale; future)
  discount: { type: DiscountSchema, default: undefined },

  // Snapshot for durability (no productId stored; derive via variant lookups if needed)
  snapshot: {
    productCode: { type: String },
    productName: { type: String },
    size: { type: String },
    color: { type: String },
  },
}, { _id: false });

const ReceiptSchema = new Schema({
  type: { type: String, enum: ['purchase', 'sale'], required: true, default: 'purchase' },
  date: { type: Date, default: () => new Date() },
  status: { type: String, enum: ['ordered', 'on_delivery', 'completed'], default: 'ordered' },

// Purchase context
  companyId: { type: Types.ObjectId, ref: 'Company' }, // who we buy from
  // Future: customerId for sales

  items: { type: [ReceiptItemSchema], validate: v => Array.isArray(v) && v.length > 0 },

  billDiscount: { type: DiscountSchema, default: undefined },
  taxPercent: { type: Number, default: 0 }, // percentage 0-100
  note: { type: String },
}, { timestamps: true });

ReceiptSchema.index({ type: 1, date: -1 });
ReceiptSchema.index({ 'items.variantId': 1 });
ReceiptSchema.index({ companyId: 1 });
ReceiptSchema.index({ status: 1, date: -1 });
ReceiptSchema.index({ companyId: 1, date: -1 });
ReceiptSchema.index({ status: 1 });

export default mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema);


