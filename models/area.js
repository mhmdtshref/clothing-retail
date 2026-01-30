import mongoose from 'mongoose';
const { Schema } = mongoose;

const AreaSchema = new Schema(
  {
    providerAreaId: { type: Number, required: true },
    providerCityId: { type: Number, required: true },
    provider: { type: String, enum: ['optimus', 'sabeq_laheq'], required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

AreaSchema.index({ provider: 1, providerAreaId: 1 }, { unique: true });
AreaSchema.index({ provider: 1, providerCityId: 1, name: 1 });

export default mongoose.models.Area || mongoose.model('Area', AreaSchema);
