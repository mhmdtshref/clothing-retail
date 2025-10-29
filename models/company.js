import mongoose from 'mongoose';
const { Schema } = mongoose;

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

CompanySchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
