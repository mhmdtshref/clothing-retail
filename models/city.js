import mongoose from 'mongoose';
const { Schema } = mongoose;

const CitySchema = new Schema(
  {
    providerCityId: { type: Number, required: true },
    provider: { type: String, enum: ['optimus', 'sabeq_laheq'], required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

CitySchema.index({ provider: 1, providerCityId: 1 }, { unique: true });
CitySchema.index({ provider: 1, name: 1 });

export default mongoose.models.City || mongoose.model('City', CitySchema);
