import * as authService from './auth.service.js';
import catchAsync from '../../utils/catch-async.js';

export const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: result.user.role === 'DRIVER'
      ? 'Registration successful. Please wait for admin approval before going online.'
      : 'Registration successful.',
    data: result,
  });
});

export const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

export const refresh = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    data: tokens,
  });
});

// ─── Forgot Password Controllers ──────────────────────────────────

/**
 * POST /auth/forgot-password
 * Bước 1: Người dùng nhập email – gửi OTP
 */
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await authService.sendForgotPasswordOtp(email);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * POST /auth/verify-otp
 * Bước 2: Người dùng nhập OTP nhận qua email
 */
export const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const result = await authService.verifyForgotPasswordOtp(email, otp);

  res.status(200).json({
    success: true,
    message: result.message,
    data: { resetToken: result.resetToken },
  });
});

/**
 * POST /auth/reset-password
 * Bước 3: Người dùng đặt lại mật khẩu mới
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  const result = await authService.resetPassword(email, resetToken, newPassword);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});
