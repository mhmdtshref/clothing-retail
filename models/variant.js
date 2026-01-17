import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const VariantSchema = new Schema(
  {
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    companyId: { type: Types.ObjectId, ref: 'Company', required: true }, // who supplies this product variant
    sizeId: { type: Types.ObjectId, ref: 'VariantSize', required: true },
    colorId: { type: Types.ObjectId, ref: 'VariantColor', required: true },
    qty: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// One supplier-company per size/color for a product
VariantSchema.index({ productId: 1, sizeId: 1, colorId: 1, companyId: 1 }, { unique: true });
VariantSchema.index({ companyId: 1 });
VariantSchema.index({ productId: 1 });

export default mongoose.models.Variant || mongoose.model('Variant', VariantSchema);
