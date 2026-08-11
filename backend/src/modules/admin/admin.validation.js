import { z } from 'zod';

export const approveDriverSchema = z.object({
  action: z.enum(['approve', 'reject']).optional(),
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  rejectionReason: z.string().optional(),
  reason: z.string().optional(),
}).refine(data => data.action || data.status, {
  message: 'Action or status is required',
}).refine(data => {
  const isReject = data.action === 'reject' || data.status === 'REJECTED';
  const reasonText = data.rejectionReason || data.reason;
  if (isReject && (!reasonText || !reasonText.trim())) {
    return false;
  }
  return true;
}, {
  message: 'Vui lòng cung cấp lý do từ chối duyệt tài xế',
  path: ['rejectionReason'],
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
