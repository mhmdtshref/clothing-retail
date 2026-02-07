import { z } from 'zod';

export const VariantSizeGroupCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200).trim(),
  sizeIds: z.array(z.string().min(1)).min(1, 'sizeIds must contain at least one id'),
});

export const VariantSizeGroupUpdateSchema = VariantSizeGroupCreateSchema.partial();
