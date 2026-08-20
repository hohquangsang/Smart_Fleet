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

export const uploadAvatar = catchAsync(async (req, res) => {
  const { avatarBase64 } = req.body;
  if (!avatarBase64 || !avatarBase64.startsWith('data:image/')) {
    return res.status(400).json({ success: false, error: { message: 'Dữ liệu ảnh không hợp lệ' } });
  }
  // Limit size: base64 of 5MB image ≈ 6.67MB string
  if (avatarBase64.length > 7 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: { message: 'Ảnh vượt quá 5 MB' } });
  }
  const profile = await settingsService.updateAdminAvatar(req.user.id, avatarBase64);
  res.status(200).json({ success: true, data: { avatarUrl: profile.avatar, profile } });
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
