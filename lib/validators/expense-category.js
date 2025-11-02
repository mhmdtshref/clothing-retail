import { z } from 'zod';

export const ExpenseCategoryCreateSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const ExpenseCategoryUpdateSchema = ExpenseCategoryCreateSchema.partial();


