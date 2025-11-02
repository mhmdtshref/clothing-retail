import mongoose from 'mongoose';
const { Schema } = mongoose;

const ExpenseCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 140, unique: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Secondary indexes (ensure uniqueness at DB level as well)
ExpenseCategorySchema.index({ name: 1 }, { unique: true });
ExpenseCategorySchema.index({ slug: 1 }, { unique: true });

export default mongoose.models.ExpenseCategory || mongoose.model('ExpenseCategory', ExpenseCategorySchema);


