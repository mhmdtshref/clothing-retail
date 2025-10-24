import { z } from 'zod';

export const ProductCreateSchema = z.object({
  code: z.string().min(1).max(120).trim(),
  name: z.string().max(200).trim().optional().default(''),
  basePrice: z.number().nonnegative().default(0),
  status: z.enum(['active', 'archived']).optional().default('active'),
});


