import * as adminService from './admin.service.js';
import catchAsync from '../../utils/catch-async.js';

export const getDashboard = catchAsync(async (_req, res) => {
  const dashboardData = await adminService.getDashboardStats();

  res.status(200).json({
    success: true,
    data: dashboardData,
  });
});

export const getBadgeCounts = catchAsync(async (_req, res) => {
  const result = await adminService.getBadgeCounts();

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getOrders = catchAsync(async (req, res) => {
  const result = await adminService.getAllOrders(req.query);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const deleteOrders = catchAsync(async (req, res) => {
  const { orderIds } = req.body;
  const result = await adminService.deleteOrders(orderIds, req.user.id);

  res.status(200).json({
    success: true,
    message: `Đã xóa thành công ${result.count} đơn hàng`,
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

export const getUsers = catchAsync(async (_req, res) => {
  const users = await adminService.getAllUsers();

  res.status(200).json({
    success: true,
    data: { users },
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
  const action = req.body.action || (req.body.status === 'APPROVED' ? 'approve' : 'reject');
  const rejectionReason = req.body.rejectionReason || req.body.reason || null;

  const result = await adminService.updateDriverApproval(
    req.params.id,
    req.user.id,
    action,
    rejectionReason
  );

  res.status(200).json({
    success: true,
    message: result.deleted
      ? 'Hồ sơ bị từ chối lần 2 và tài khoản đã bị xóa khỏi hệ thống'
      : `Hồ sơ tài xế đã được ${action === 'approve' ? 'phê duyệt' : 'từ chối'} thành công`,
    data: { driver: result },
  });
});

export const blockDriver = catchAsync(async (req, res) => {
  const { reason } = req.body;
  const driver = await adminService.blockDriver(req.params.id, req.user.id, reason);

  res.status(200).json({
    success: true,
    message: 'Tài xế đã bị khóa tài khoản',
    data: { driver },
  });
});

export const unblockDriver = catchAsync(async (req, res) => {
  const driver = await adminService.unblockDriver(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Đã mở khóa tài khoản cho tài xế',
    data: { driver },
  });
});

export const resolveDriverAppeal = catchAsync(async (req, res) => {
  const driver = await adminService.resolveDriverAppeal(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Đã xác nhận xử lý khiếu nại của tài xế',
    data: { driver },
  });
});

export const blockUser = catchAsync(async (req, res) => {
  const { reason } = req.body;
  const user = await adminService.blockUser(req.params.id, req.user.id, reason);

  res.status(200).json({
    success: true,
    message: 'Người dùng khách hàng đã bị khóa tài khoản',
    data: { user },
  });
});

export const unblockUser = catchAsync(async (req, res) => {
  const user = await adminService.unblockUser(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Đã mở khóa tài khoản cho người dùng khách hàng',
    data: { user },
  });
});

export const getAnalytics = catchAsync(async (_req, res) => {
  const analytics = await adminService.getAnalytics();

  res.status(200).json({
    success: true,
    data: { analytics },
  });
});
