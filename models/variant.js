import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const VariantSchema = new Schema({
  productId: { type: Types.ObjectId, ref: 'Product', required: true },
  companyId: { type: Types.ObjectId, ref: 'Company', required: true }, // who supplies this product variant
  size: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
}, { timestamps: true });

// Ensure one size/color per product
VariantSchema.index({ productId: 1, size: 1, color: 1 }, { unique: true });
// Helpful filter
VariantSchema.index({ companyId: 1 });

export default mongoose.models.Variant || mongoose.model('Variant', VariantSchema);


