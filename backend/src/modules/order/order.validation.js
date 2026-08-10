import { z } from 'zod';

export const createOrderSchema = z.object({
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  dropoffAddress: z.string().min(1, 'Dropoff address is required'),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  vehicleType: z.enum(['motorcycle', 'car_4', 'car_7']).optional().default('motorcycle'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PICKED_UP', 'DELIVERED'], {
    errorMap: () => ({ message: 'Status must be PICKED_UP or DELIVERED' }),
  }),
});
