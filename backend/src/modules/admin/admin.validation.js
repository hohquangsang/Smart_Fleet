import { z } from 'zod';

export const approveDriverSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'Action must be approve or reject' }),
  }),
});

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'MATCHED', 'PICKED_UP', 'DELIVERED', 'CANCELLED']).optional(),
  search: z.string().optional(),
});
