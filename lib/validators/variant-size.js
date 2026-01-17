import { z } from 'zod';

export const VariantSizeCreateSchema = z.object({
  name: z.object({
    en: z.string().min(1, 'name.en is required').max(200).trim(),
    ar: z.string().min(1, 'name.ar is required').max(200).trim(),
  }),
});

export const VariantSizeUpdateSchema = VariantSizeCreateSchema.partial();

