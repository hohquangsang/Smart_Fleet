import * as settingsService from './settings.service.js';
import catchAsync from '../../utils/catch-async.js';

// ─── Profile ────────────────────────────────────────────────────────────────
export const getProfile = catchAsync(async (req, res) => {
  const profile = await settingsService.getAdminProfile(req.user.id);
  res.status(200).json({ success: true, data: { profile } });
});

export const updateProfile = catchAsync(async (req, res) => {
  const { fullName, phoneNumber } = req.body;
  const profile = await settingsService.updateAdminProfile(req.user.id, { fullName, phoneNumber });
  res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data: { profile } });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await settingsService.changeAdminPassword(req.user.id, { currentPassword, newPassword });
  res.status(200).json({ success: true, ...result });
});

// ─── System Config ──────────────────────────────────────────────────────────
export const getConfig = catchAsync(async (_req, res) => {
  const config = await settingsService.getSystemConfig();
  res.status(200).json({ success: true, data: { config } });
});

export const updateConfig = catchAsync(async (req, res) => {
  const { updates } = req.body;
  const result = await settingsService.updateSystemConfig(updates, req.user.id);
  res.status(200).json({ success: true, message: 'Cấu hình đã được lưu thành công', data: { updated: result.length } });
});

// ─── Admin Accounts ─────────────────────────────────────────────────────────
export const getAdmins = catchAsync(async (_req, res) => {
  const admins = await settingsService.getAllAdmins();
  res.status(200).json({ success: true, data: { admins } });
});

export const createAdmin = catchAsync(async (req, res) => {
  const admin = await settingsService.createAdminAccount(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Tạo tài khoản admin thành công', data: { admin } });
});

export const toggleAdminStatus = catchAsync(async (req, res) => {
  const result = await settingsService.toggleAdminStatus(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: result.isBlocked ? 'Đã vô hiệu hóa admin' : 'Đã kích hoạt admin', data: { admin: result } });
});

export const deleteAdmin = catchAsync(async (req, res) => {
  const result = await settingsService.deleteAdminAccount(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: result.message });
});

// ─── Audit Log ──────────────────────────────────────────────────────────────
export const getAuditLogs = catchAsync(async (req, res) => {
  const result = await settingsService.getAuditLogs(req.query);
  res.status(200).json({ success: true, data: result });
});
