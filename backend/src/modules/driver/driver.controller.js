import * as driverService from './driver.service.js';
import catchAsync from '../../utils/catch-async.js';

export const getProfile = catchAsync(async (req, res) => {
  const driver = await driverService.getDriverProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: { driver },
  });
});

export const updateProfile = catchAsync(async (req, res) => {
  const driver = await driverService.updateDriverProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { driver },
  });
});

export const submitAppeal = catchAsync(async (req, res) => {
  const driver = await driverService.submitDriverAppeal(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Đã gửi khiếu nại và bổ sung thông tin hồ sơ đến Admin xét duyệt lại.',
    data: { driver },
  });
});

export const toggleStatus = catchAsync(async (req, res) => {
  const result = await driverService.toggleStatus(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: `Driver is now ${result.status}`,
    data: result,
  });
});

export const acceptOrder = catchAsync(async (req, res) => {
  const { id } = req.params;
  const order = await driverService.acceptOrder(req.user.id, id);

  res.status(200).json({
    success: true,
    message: 'Order accepted successfully',
    data: { order },
  });
});

export const getEarnings = catchAsync(async (req, res) => {
  const { period } = req.query;
  const data = await driverService.getDriverEarnings(req.user.id, { period });

  res.status(200).json({
    success: true,
    data,
  });
});
