import { Router } from 'express';
import * as authController from './auth.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from './auth.validation.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);

// ─── Forgot Password (3 bước) ──
// Bước 1: Nhập email → gửi OTP
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
// Bước 2: Xác minh OTP → nhận reset token
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
// Bước 3: Đặt mật khẩu mới bằng reset token
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
