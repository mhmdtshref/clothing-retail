import mongoose from 'mongoose';
const { Schema } = mongoose;

const VariantColorSchema = new Schema(
  {
    name: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, required: true, trim: true },
    },
    nameKey: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

VariantColorSchema.index({ nameKey: 1 }, { unique: true });

export default mongoose.models.VariantColor || mongoose.model('VariantColor', VariantColorSchema);
