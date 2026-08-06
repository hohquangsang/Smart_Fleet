import * as adminService from './admin.service.js';
import catchAsync from '../../utils/catch-async.js';

export const getDashboard = catchAsync(async (_req, res) => {
  const stats = await adminService.getDashboardStats();

  res.status(200).json({
    success: true,
    data: { stats },
  });
});

export const getOrders = catchAsync(async (req, res) => {
  const result = await adminService.getAllOrders(req.query);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getDrivers = catchAsync(async (req, res) => {
  const { approval } = req.query;
  const drivers = await adminService.getAllDrivers(
    approval ? { approvalStatus: approval.toUpperCase() } : {}
  );

  res.status(200).json({
    success: true,
    data: { drivers },
  });
});

export const getPendingDrivers = catchAsync(async (_req, res) => {
  const drivers = await adminService.getPendingDrivers();

  res.status(200).json({
    success: true,
    data: { drivers },
  });
});

export const approveDriver = catchAsync(async (req, res) => {
  const { action } = req.body;
  const driver = await adminService.updateDriverApproval(
    req.params.id,
    req.user.id,
    action
  );

  res.status(200).json({
    success: true,
    message: `Driver ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    data: { driver },
  });
});

export const getAnalytics = catchAsync(async (_req, res) => {
  const analytics = await adminService.getAnalytics();

  res.status(200).json({
    success: true,
    data: { analytics },
  });
});
