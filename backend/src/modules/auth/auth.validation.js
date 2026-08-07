import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  fullName: z.string().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(100, 'Họ và tên tối đa 100 ký tự'),
  phoneNumber: z.string().min(9, 'Số điện thoại phải từ 9 đến 20 chữ số').max(20, 'Số điện thoại tối đa 20 chữ số'),
  role: z.enum(['CUSTOMER', 'DRIVER'], {
    errorMap: () => ({ message: 'Vai trò phải là Khách hàng (CUSTOMER) hoặc Tài xế (DRIVER)' }),
  }),
  // Driver-only fields (required when role=DRIVER)
  vehicleType: z.string().optional(),
  licensePlate: z.string().optional(),
}).refine(
  (data) => {
    if (data.role === 'DRIVER') {
      return !!data.vehicleType && !!data.licensePlate;
    }
    return true;
  },
  {
    message: 'Loại xe và biển số xe là bắt buộc đối với Tài xế',
    path: ['vehicleType'],
  }
);

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống'),
});

