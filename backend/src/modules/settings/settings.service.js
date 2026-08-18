import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import bcrypt from 'bcryptjs';
import { NotFoundError, BadRequestError, ConflictError, UnauthorizedError } from '../../utils/api-error.js';

const REDIS_CONFIG_KEY = 'system:config';

// ─── Default Configs ───────────────────────────────────────────────────────
const DEFAULT_CONFIGS = [
  // PRICING
  { key: 'BASE_FARE_PER_KM',       value: '12000', group: 'PRICING',       label: 'Cước cơ bản (VNĐ/km)' },
  { key: 'MIN_FARE',               value: '15000', group: 'PRICING',       label: 'Phí tối thiểu (VNĐ)' },
  { key: 'SURGE_MULTIPLIER',       value: '1.5',   group: 'PRICING',       label: 'Hệ số giờ cao điểm' },
  { key: 'NIGHT_SURCHARGE_PCT',    value: '20',    group: 'PRICING',       label: 'Phụ phí ban đêm (%)' },

  // MATCHING
  { key: 'DRIVER_SEARCH_RADIUS_KM', value: '5',   group: 'MATCHING',      label: 'Bán kính tìm tài xế (km)' },
  { key: 'ORDER_EXPIRE_SECONDS',    value: '120',  group: 'MATCHING',      label: 'Thời gian hết hạn đơn (giây)' },
  { key: 'MAX_DISPATCH_ATTEMPTS',   value: '5',    group: 'MATCHING',      label: 'Số lần thử tìm tài xế' },

  // GENERAL
  { key: 'SYSTEM_NAME',      value: 'SmartFleet',       group: 'GENERAL', label: 'Tên hệ thống' },
  { key: 'TIMEZONE',         value: 'Asia/Ho_Chi_Minh', group: 'GENERAL', label: 'Múi giờ' },
  { key: 'MAINTENANCE_MODE', value: 'false',             group: 'GENERAL', label: 'Chế độ bảo trì' },

  // NOTIFICATIONS
  { key: 'NOTIFY_NEW_ORDER',    value: 'true',  group: 'NOTIFICATIONS', label: 'Thông báo đơn hàng mới' },
  { key: 'NOTIFY_NEW_DRIVER',   value: 'true',  group: 'NOTIFICATIONS', label: 'Thông báo tài xế đăng ký mới' },
  { key: 'DAILY_REPORT_EMAIL',  value: 'false', group: 'NOTIFICATIONS', label: 'Báo cáo email hàng ngày' },
  { key: 'SYSTEM_ALERTS',       value: 'true',  group: 'NOTIFICATIONS', label: 'Cảnh báo hệ thống' },
];

// ─── Seed default configs if not exist ─────────────────────────────────────
export const seedDefaultConfigs = async () => {
  for (const cfg of DEFAULT_CONFIGS) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
};

// ─── Audit Log Helper ───────────────────────────────────────────────────────
export const createAuditLog = async (adminId, action, targetType = null, targetId = null, detail = null) => {
  try {
    return await prisma.auditLog.create({
      data: { adminId, action, targetType, targetId: targetId ? String(targetId) : null, detail },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
};

// ─── Profile ────────────────────────────────────────────────────────────────
export const getAdminProfile = async (adminId) => {
  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, fullName: true, email: true, phoneNumber: true, avatar: true, createdAt: true, role: true },
  });
  if (!user) throw new NotFoundError('Không tìm thấy tài khoản');
  return user;
};

export const updateAdminProfile = async (adminId, { fullName, phoneNumber }) => {
  if (!fullName?.trim()) throw new BadRequestError('Họ và tên không được để trống');

  const updated = await prisma.user.update({
    where: { id: adminId },
    data: {
      fullName: fullName.trim(),
      ...(phoneNumber ? { phoneNumber: phoneNumber.trim() } : {}),
    },
    select: { id: true, fullName: true, email: true, phoneNumber: true, avatar: true },
  });

  await createAuditLog(adminId, 'UPDATE_PROFILE', 'USER', adminId, { fullName });
  return updated;
};

export const changeAdminPassword = async (adminId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới');
  }
  if (newPassword.length < 8) {
    throw new BadRequestError('Mật khẩu mới phải có ít nhất 8 ký tự');
  }

  const user = await prisma.user.findUnique({ where: { id: adminId } });
  if (!user) throw new NotFoundError('Không tìm thấy tài khoản');

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new UnauthorizedError('Mật khẩu hiện tại không chính xác');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: adminId }, data: { passwordHash } });
  await createAuditLog(adminId, 'CHANGE_PASSWORD', 'USER', adminId);
  return { message: 'Đổi mật khẩu thành công' };
};

// ─── System Config ──────────────────────────────────────────────────────────
export const getSystemConfig = async () => {
  // Try Redis cache first
  try {
    const cached = await redis.get(REDIS_CONFIG_KEY);
    if (cached) return JSON.parse(cached);
  } catch { /* ignore redis errors */ }

  const configs = await prisma.systemConfig.findMany({ orderBy: { createdAt: 'asc' } });

  // Group by 'group' field
  const grouped = configs.reduce((acc, c) => {
    const g = c.group || 'OTHER';
    if (!acc[g]) acc[g] = [];
    acc[g].push({ key: c.key, value: c.value, label: c.label });
    return acc;
  }, {});

  // Cache for 5 minutes
  try {
    await redis.set(REDIS_CONFIG_KEY, JSON.stringify(grouped), 'EX', 300);
  } catch { /* ignore */ }

  return grouped;
};

export const updateSystemConfig = async (updates, adminId) => {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new BadRequestError('Không có cấu hình nào để cập nhật');
  }

  const results = await prisma.$transaction(
    updates.map(({ key, value }) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value), updatedBy: adminId },
        create: { key, value: String(value), updatedBy: adminId },
      })
    )
  );

  // Invalidate Redis cache
  try {
    await redis.del(REDIS_CONFIG_KEY);
  } catch { /* ignore */ }

  await createAuditLog(adminId, 'UPDATE_SYSTEM_CONFIG', 'CONFIG', null, {
    keys: updates.map((u) => u.key),
  });

  return results;
};

// ─── Admin Account Management ────────────────────────────────────────────────
export const getAllAdmins = async () => {
  return prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, fullName: true, email: true, phoneNumber: true, isBlocked: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
};

export const createAdminAccount = async ({ email, fullName, password }, requestingAdminId) => {
  if (!email?.trim() || !fullName?.trim() || !password) {
    throw new BadRequestError('Vui lòng điền đầy đủ email, họ tên và mật khẩu');
  }
  if (password.length < 8) {
    throw new BadRequestError('Mật khẩu phải có ít nhất 8 ký tự');
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) throw new ConflictError('Email này đã được đăng ký');

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      email: email.trim(),
      fullName: fullName.trim(),
      passwordHash,
      role: 'ADMIN',
      phoneNumber: `admin_${Date.now()}`,
    },
    select: { id: true, fullName: true, email: true, createdAt: true },
  });

  await createAuditLog(requestingAdminId, 'CREATE_ADMIN', 'USER', admin.id, { email: admin.email });
  return admin;
};

export const toggleAdminStatus = async (targetAdminId, requestingAdminId) => {
  if (targetAdminId === requestingAdminId) {
    throw new BadRequestError('Không thể thay đổi trạng thái của chính mình');
  }

  const admin = await prisma.user.findUnique({ where: { id: targetAdminId } });
  if (!admin || admin.role !== 'ADMIN') throw new NotFoundError('Không tìm thấy tài khoản admin');

  const updated = await prisma.user.update({
    where: { id: targetAdminId },
    data: { isBlocked: !admin.isBlocked },
    select: { id: true, fullName: true, email: true, isBlocked: true },
  });

  await createAuditLog(requestingAdminId, updated.isBlocked ? 'DISABLE_ADMIN' : 'ENABLE_ADMIN', 'USER', targetAdminId);
  return updated;
};

export const deleteAdminAccount = async (targetAdminId, requestingAdminId) => {
  if (targetAdminId === requestingAdminId) {
    throw new BadRequestError('Không thể xóa chính mình');
  }

  const admin = await prisma.user.findUnique({ where: { id: targetAdminId } });
  if (!admin || admin.role !== 'ADMIN') throw new NotFoundError('Không tìm thấy tài khoản admin');

  await prisma.user.delete({ where: { id: targetAdminId } });
  await createAuditLog(requestingAdminId, 'DELETE_ADMIN', 'USER', targetAdminId, { email: admin.email });
  return { message: 'Đã xóa tài khoản admin' };
};

// ─── Audit Log ──────────────────────────────────────────────────────────────
export const getAuditLogs = async ({ page = 1, limit = 20, action, adminId, from, to } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  const where = {};
  if (action) where.action = action;
  if (adminId) where.adminId = adminId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        admin: { select: { fullName: true, email: true, avatar: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};
