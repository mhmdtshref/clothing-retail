import mongoose from 'mongoose';
const { Schema } = mongoose;

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

CompanySchema.index({ name: 1 }, { unique: true });
// Sparse unique index avoids breaking existing docs that may not have nameKey yet
CompanySchema.index({ nameKey: 1 }, { unique: true, sparse: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
