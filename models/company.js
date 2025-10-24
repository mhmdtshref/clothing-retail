import mongoose from 'mongoose';
const { Schema } = mongoose;

const CompanySchema = new Schema({
  name: { type: String, required: true, trim: true },
  taxPercent: { type: Number, default: 0 }, // default tax we pay to this company (0-100)
  note: { type: String },
}, { timestamps: true });

CompanySchema.index({ name: 1 }, { unique: true });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);


