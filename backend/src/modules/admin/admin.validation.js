import { z } from 'zod';

export const approveDriverSchema = z.object({
  action: z.enum(['approve', 'reject']).optional(),
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
}).refine(data => data.action || data.status, {
  message: 'Action or status is required',
});

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum([
    'PENDING',
    'DISPATCHING',
    'DRIVER_ACCEPTED',
    'MATCHED',
    'IN_TRANSIT',
    'PICKED_UP',
    'DELIVERED',
    'CANCELLED',
    'EXPIRED_NO_DRIVER',
  ]).optional(),
  search: z.string().optional(),
});
