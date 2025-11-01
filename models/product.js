import mongoose from 'mongoose';
const { Schema } = mongoose;

// Optional embedded image schema for a product
const ImageSchema = new Schema(
  {
    url: { type: String, trim: true },
    key: { type: String, trim: true },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    contentType: { type: String, trim: true },
  },
  { _id: false },
);

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
    image: { type: ImageSchema, default: undefined },
  },
  { timestamps: true },
);

// Code must be unique now that we removed company scoping
ProductSchema.index({ code: 1 }, { unique: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
