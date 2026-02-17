import { z } from 'zod';

const VariantSizeNameSchema = z.object({
  en: z.string().min(1, 'name.en is required').max(200).trim(),
  ar: z.string().min(1, 'name.ar is required').max(200).trim(),
});

const VariantSizePrioritySchema = z.preprocess((v) => {
  if (v === null || typeof v === 'undefined') return undefined;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return undefined;
    return Number(s);
  }
  return v;
}, z.number().int().min(0));

export const VariantSizeCreateSchema = z.object({
  name: VariantSizeNameSchema,
  priority: VariantSizePrioritySchema.optional().default(1),
});

// Important: updates must NOT default priority to 1 (avoid accidental overwrites on PATCH)
export const VariantSizeUpdateSchema = z.object({
  name: VariantSizeNameSchema.optional(),
  priority: VariantSizePrioritySchema.optional(),
});
