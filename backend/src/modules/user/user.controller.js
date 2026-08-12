import * as userService from './user.service.js';
import catchAsync from '../../utils/catch-async.js';

export const getProfile = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  });
});

export const submitAppeal = catchAsync(async (req, res) => {
  const { appealNote } = req.body;
  const user = await userService.submitUserAppeal(req.user.id, appealNote);

  res.status(200).json({
    success: true,
    message: 'Đã gửi khiếu nại mở khóa tài khoản tới Admin thành công.',
    data: { user },
  });
});

export const registerDriver = catchAsync(async (req, res) => {
  const user = await userService.registerDriver(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Nộp hồ sơ đăng ký tài xế thành công! Vui lòng chờ Admin phê duyệt.',
    data: { user },
  });
});
