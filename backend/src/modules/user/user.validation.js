import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phoneNumber: z.string().min(9).max(20).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
  licenseImage: z.string().nullable().optional(),
  cccdImage: z.string().nullable().optional(),
});
