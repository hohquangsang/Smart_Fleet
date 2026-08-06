import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phoneNumber: z.string().min(9, 'Invalid phone number').max(20),
  role: z.enum(['CUSTOMER', 'DRIVER'], {
    errorMap: () => ({ message: 'Role must be CUSTOMER or DRIVER' }),
  }),
  // Driver-only fields (required when role=DRIVER)
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
}).refine(
  (data) => {
    if (data.role === 'DRIVER') {
      return data.vehicleType && data.licensePlate;
    }
    return true;
  },
  {
    message: 'vehicleType and licensePlate are required for DRIVER registration',
    path: ['vehicleType'],
  }
);

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
