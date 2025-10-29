import mongoose from 'mongoose';
const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    code: { type: String, required: true, trim: true }, // merchant product code (globally unique)
    name: { type: String, trim: true },
    basePrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true },
);

// Code must be unique now that we removed company scoping
ProductSchema.index({ code: 1 }, { unique: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
