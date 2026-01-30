import { z } from 'zod';

export const CompanyCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200).trim(),
});

export const CompanyUpdateSchema = CompanyCreateSchema.partial();
