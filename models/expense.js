import mongoose from 'mongoose';
const { Schema } = mongoose;

const ExpenseSchema = new Schema(
  {
    date: { type: Date, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
    amount: { type: Number, required: true, min: 0 },
    vendor: { type: String, trim: true, maxlength: 200 },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ categoryId: 1, date: -1 });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);


