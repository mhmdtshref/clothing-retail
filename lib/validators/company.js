import { z } from 'zod';

export const CompanyStoreSchema = z.enum(['Mini Queen', 'Lariche']);

export const CompanyCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200).trim(),
  store: CompanyStoreSchema.default('Lariche'),
});

export const CompanyUpdateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200).trim().optional(),
  store: CompanyStoreSchema.optional(),
});
