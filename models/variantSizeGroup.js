import mongoose from 'mongoose';
const { Schema } = mongoose;

const VariantSizeGroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    nameKey: { type: String, required: true, trim: true },
    sizeIds: [{ type: Schema.Types.ObjectId, ref: 'VariantSize', required: true, index: true }],
  },
  { timestamps: true },
);

VariantSizeGroupSchema.index({ nameKey: 1 }, { unique: true });

VariantSizeGroupSchema.path('sizeIds').validate({
  validator: function (v) {
    return Array.isArray(v) && v.length > 0;
  },
  message: 'sizeIds must contain at least one size id.',
});

export default mongoose.models.VariantSizeGroup ||
  mongoose.model('VariantSizeGroup', VariantSizeGroupSchema);
