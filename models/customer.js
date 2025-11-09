import mongoose from 'mongoose';
const { Schema } = mongoose;

function normalizePhone(input) {
  return String(input || '').replace(/\D/g, '');
}

const ProviderInfoSchema = new Schema(
  {
    providerCityId: { type: Number },
    providerAreaId: { type: Number },
    addressLine: { type: String, trim: true, default: '' },
    cityName: { type: String, trim: true, default: '' },
    areaName: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const CustomerSchema = new Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      set: normalizePhone,
    },
    // Provider-specific address caching
    providers: {
      type: new Schema(
        {
          optimus: { type: ProviderInfoSchema, default: undefined },
          sabeq_laheq: { type: ProviderInfoSchema, default: undefined },
        },
        { _id: false, strict: false },
      ),
      default: {},
    },
  },
  { timestamps: true },
);

// Unique index is already created via the path option `unique: true` on `phone`.

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);


