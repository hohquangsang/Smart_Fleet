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
