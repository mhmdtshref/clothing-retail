import mongoose from 'mongoose';
const { Schema } = mongoose;

function normalizePhone(input) {
  return String(input || '').replace(/\D/g, '');
}

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
  },
  { timestamps: true },
);

CustomerSchema.index({ phone: 1 }, { unique: true });

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);


