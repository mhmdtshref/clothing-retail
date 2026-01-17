import mongoose from 'mongoose';
const { Schema } = mongoose;

const VariantSizeSchema = new Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    nameKey: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

VariantSizeSchema.index({ nameKey: 1 }, { unique: true });

export default mongoose.models.VariantSize || mongoose.model('VariantSize', VariantSizeSchema);

