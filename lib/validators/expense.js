import { z } from 'zod';

export const ExpenseCreateSchema = z.object({
  date: z.coerce.date(),
  categoryId: z.string().min(1),
  amount: z.number().nonnegative(),
  vendor: z.string().trim().max(200).optional(),
  note: z.string().trim().max(500).optional(),
});

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial();


