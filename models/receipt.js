import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const DiscountSchema = new Schema(
  {
    mode: { type: String, enum: ['amount', 'percent'], default: 'amount' },
    value: { type: Number, default: 0 }, // currency amount OR percent (0-100)
  },
  { _id: false },
);

const ReceiptItemSchema = new Schema(
  {
    variantId: { type: Types.ObjectId, ref: 'Variant', required: true },
    qty: { type: Number, required: true, min: 1 },

    // Purchase vs Sale amounts
    unitCost: { type: Number, default: 0 }, // per-unit cost (purchase)
    unitPrice: { type: Number, default: 0 }, // per-unit price (sale; future)
    discount: { type: DiscountSchema, default: undefined },

    // Snapshot for durability (no productId stored; derive via variant lookups if needed)
    snapshot: {
      productCode: { type: String },
      productName: { type: String },
      size: { type: String },
      color: { type: String },
    },
  },
  { _id: false },
);

const DeliveryHistorySchema = new Schema(
  {
    at: { type: Date, default: () => new Date() },
    code: { type: String },
    note: { type: String },
    raw: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const DeliveryAddressSchema = new Schema(
  {
    line1: { type: String },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  { _id: false },
);

const DeliveryContactSchema = new Schema(
  {
    name: { type: String },
    phone: { type: String },
  },
  { _id: false },
);

const DeliverySchema = new Schema(
  {
    company: { type: String, enum: ['optimus', 'sabeq_laheq'], required: true },
    externalId: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    status: { type: String }, // raw provider status string
    address: { type: DeliveryAddressSchema, default: undefined },
    contact: { type: DeliveryContactSchema, default: undefined },
    providerMeta: { type: Schema.Types.Mixed },
    history: { type: [DeliveryHistorySchema], default: [] },
    lastSyncAt: { type: Date },
    nextSyncAt: { type: Date },
  },
  { _id: false },
);

const ReceiptSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['purchase', 'sale', 'sale_return'],
      required: true,
      default: 'purchase',
    },
    date: { type: Date, default: () => new Date() },
    status: {
      type: String,
      enum: ['ordered', 'on_delivery', 'payment_collected', 'ready_to_receive', 'completed', 'pending'],
      default: 'ordered',
    },

    // Purchase context
    companyId: { type: Types.ObjectId, ref: 'Company' }, // who we buy from
  // Sales context
  customerId: { type: Types.ObjectId, ref: 'Customer' },

    items: { type: [ReceiptItemSchema], validate: (v) => Array.isArray(v) && v.length > 0 },

    billDiscount: { type: DiscountSchema, default: undefined },
    taxPercent: { type: Number, default: 0 }, // percentage 0-100
    note: { type: String },

    // Payments (sales deposits and settlements)
    payments: {
      type: [
        new Schema(
          {
            amount: { type: Number, required: true, min: 0 },
            method: { type: String },
            note: { type: String },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // Delivery (for sale receipts with COD)
    delivery: { type: DeliverySchema, default: undefined },
  },
  { timestamps: true },
);

ReceiptSchema.index({ type: 1, date: -1 });
ReceiptSchema.index({ 'items.variantId': 1 });
ReceiptSchema.index({ companyId: 1 });
ReceiptSchema.index({ status: 1, date: -1 });
ReceiptSchema.index({ companyId: 1, date: -1 });
ReceiptSchema.index({ status: 1 });
ReceiptSchema.index({ customerId: 1 });
ReceiptSchema.index({ customerId: 1, date: -1 });
ReceiptSchema.index({ 'delivery.company': 1 });
ReceiptSchema.index({ 'delivery.nextSyncAt': 1 });

export default mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema);
