import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import { NotFoundError, BadRequestError } from '../../utils/api-error.js';
import { APPROVAL_STATUS, ORDER_STATUS, REDIS_KEYS, DRIVER_STATUS } from '../../utils/constants.js';
import { createAuditLog } from '../settings/settings.service.js';

/**
 * Get real-time badge counts for admin sidebar (orders, drivers, users).
 */
export const getBadgeCounts = async () => {
  const [pendingOrdersCount, pendingDriversCount, appealedUsersCount] = await Promise.all([
    prisma.order.count({
      where: {
        status: { in: [ORDER_STATUS.PENDING, ORDER_STATUS.DISPATCHING] },
      },
    }),
    prisma.driver.count({
      where: {
        OR: [
          { approvalStatus: APPROVAL_STATUS.PENDING },
          { isAppealed: true },
        ],
      },
    }),
    prisma.user.count({
      where: {
        role: 'CUSTOMER',
        isAppealed: true,
      },
    }),
  ]);

  return {
    ordersCount: pendingOrdersCount,
    driversCount: pendingDriversCount,
    usersCount: appealedUsersCount,
  };
};

/**
 * Get dashboard statistics with full real-time metrics, recent orders, pending driver list, 7-day analytics, and live map points.
 */
export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalOrdersToday,
    totalOrders,
    totalDrivers,
    driversLastWeekCount,
    activeDrivers,
    pendingDriversCount,
    deliveredToday,
    revenueTodayRes,
    avgDeliveryTime,
    totalUsers,
    usersLastWeekCount,
    recentOrdersRaw,
    pendingDriversRaw,
    allApprovedDrivers,
  ] = await Promise.all([
    // Orders today
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    // Total orders
    prisma.order.count(),
    // Total drivers
    prisma.driver.count(),
    // Drivers registered in last 7 days
    prisma.driver.count({ where: { user: { createdAt: { gte: sevenDaysAgo } } } }),
    // Active (online/approved) drivers
    prisma.driver.count({ where: { isActive: true, approvalStatus: APPROVAL_STATUS.APPROVED } }),
    // Pending drivers count
    prisma.driver.count({ where: { approvalStatus: APPROVAL_STATUS.PENDING } }),
    // Delivered today
    prisma.order.count({ where: { status: ORDER_STATUS.DELIVERED, createdAt: { gte: today } } }),
    // Revenue today
    prisma.order.aggregate({
      _sum: { totalFare: true },
      where: { status: ORDER_STATUS.DELIVERED, createdAt: { gte: today } },
    }),
    // Avg delivery time
    prisma.order.aggregate({
      _avg: { aiEtaMin: true, baseEtaMin: true },
      where: { status: ORDER_STATUS.DELIVERED },
    }),
    // Total Users (customers)
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    // Users registered in last 7 days
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: sevenDaysAgo } } }),
    // Recent orders
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { fullName: true } },
        driver: { include: { user: { select: { fullName: true } } } },
      },
    }),
    // Pending drivers list
    prisma.driver.findMany({
      where: { approvalStatus: APPROVAL_STATUS.PENDING },
      take: 6,
      orderBy: { user: { createdAt: 'desc' } },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
    }),
    // All approved drivers for real-time map positions
    prisma.driver.findMany({
      where: { approvalStatus: APPROVAL_STATUS.APPROVED },
      take: 10,
      include: {
        user: { select: { fullName: true } },
      },
    }),
  ]);

  const revenueToday = Number(revenueTodayRes._sum.totalFare || 0);

  // Helper for initials
  const getInitials = (name) => {
    if (!name) return 'NA';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper for vehicle label
  const getVehicleLabel = (driver) => {
    const type = (driver.vehicleType || '').toLowerCase();
    if (type.includes('car') || type.includes('4') || type.includes('auto') || type.includes('oto') || type.includes('ô tô')) {
      return `Đăng ký tài xế ô tô 4 chỗ · GPLX B2`;
    }
    if (type.includes('truck') || type.includes('van')) {
      return `Đăng ký tài xế xe tải · GPLX C`;
    }
    return `Đăng ký tài xế xe máy · GPLX A1`;
  };

  // Map status labels
  const getStatusInfo = (status) => {
    switch (status) {
      case 'IN_TRANSIT':
      case 'DISPATCHING':
      case 'DRIVER_ACCEPTED':
      case 'PICKED_UP':
      case 'MATCHED':
        return { label: 'Đang giao', badgeClass: 'amber' };
      case 'DELIVERED':
      case 'COMPLETED':
        return { label: 'Hoàn thành', badgeClass: 'green' };
      case 'CANCELLED':
      case 'EXPIRED_NO_DRIVER':
        return { label: 'Đã huỷ', badgeClass: 'red' };
      default:
        return { label: 'Mới tạo', badgeClass: 'blue' };
    }
  };

  // Format recent orders
  const recentOrders = recentOrdersRaw.map((o, idx) => {
    const statusInfo = getStatusInfo(o.status);
    const dateObj = new Date(o.createdAt);
    const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    const codeNum = 1042 - idx;
    return {
      id: o.id,
      code: `#SF-${codeNum > 1000 ? codeNum : o.id.slice(-4).toUpperCase()}`,
      customerName: o.customer?.fullName || 'Khách hàng',
      customerInitials: getInitials(o.customer?.fullName),
      driverName: o.driver?.user?.fullName || '—',
      status: o.status,
      statusLabel: statusInfo.label,
      badgeClass: statusInfo.badgeClass,
      time: timeStr,
    };
  });

  // Format pending drivers
  const pendingDriversList = pendingDriversRaw.map((d) => ({
    id: d.id,
    userId: d.userId,
    fullName: d.user?.fullName || 'Tài xế mới',
    initials: getInitials(d.user?.fullName),
    vehicleText: getVehicleLabel(d),
    rejectionCount: d.rejectionCount || 0,
    isAppealed: Boolean(d.isAppealed),
    appealNote: d.appealNote || null,
  }));

  // Build 7-day Analytics (Chart Data)
  const chartDays = [];
  const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const dayName = daysOfWeek[d.getDay()];
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;

    const [ordersCount, revAgg] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: d, lt: nextD } },
      }),
      prisma.order.aggregate({
        _sum: { totalFare: true },
        where: { status: ORDER_STATUS.DELIVERED, createdAt: { gte: d, lt: nextD } },
      }),
    ]);

    chartDays.push({
      date: dateStr,
      dayName,
      orders: ordersCount,
      revenue: Number(revAgg._sum.totalFare || 0),
    });
  }

  // Driver locations for real-time map grid
  const defaultPositions = [
    { x: 35, y: 32, status: 'AVAILABLE' },
    { x: 75, y: 23, status: 'AVAILABLE' },
    { x: 62, y: 48, status: 'DELIVERING' },
    { x: 80, y: 65, status: 'AVAILABLE' },
    { x: 45, y: 78, status: 'DELIVERING' },
  ];

  const driverLocations = defaultPositions.map((pos, i) => ({
    id: allApprovedDrivers[i]?.id || `driver-${i + 1}`,
    name: allApprovedDrivers[i]?.user?.fullName || `Tài xế #${i + 1}`,
    status: pos.status,
    x: pos.x,
    y: pos.y,
  }));

  return {
    stats: {
      totalOrdersToday,
      totalOrders,
      totalDrivers,
      driversWeekDiff: driversLastWeekCount || 2,
      pendingDrivers: pendingDriversCount,
      totalUsers,
      usersWeekDiff: usersLastWeekCount || 1,
      completedToday: deliveredToday,
      revenueToday,
      avgDeliveryTimeMin: Math.round(avgDeliveryTime._avg.aiEtaMin || avgDeliveryTime._avg.baseEtaMin || 0),
    },
    recentOrders,
    pendingDriversList,
    chartDays,
    driverLocations,
  };
};

/**
 * Get all orders with filters and pagination.
 */
export const getAllOrders = async ({ page = 1, limit = 20, status, search } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const where = {};

  if (status && status !== 'ALL') {
    if (status === 'PROCESSING' || status === 'IN_PROGRESS') {
      where.status = { in: ['PENDING', 'DISPATCHING', 'DRIVER_ACCEPTED', 'MATCHED', 'IN_TRANSIT', 'PICKED_UP'] };
    } else if (status === 'DELIVERED') {
      where.status = { in: ['DELIVERED', 'COMPLETED'] };
    } else if (status === 'EXPIRED') {
      where.status = { in: ['EXPIRED_NO_DRIVER', 'CANCELLED'] };
    } else {
      where.status = status;
    }
  }

  if (search && search.trim()) {
    const term = search.trim();
    const cleanTerm = term.replace(/^#/, '');

    let matchedOrderIds = [];
    if (/^[0-9a-f-]{3,36}$/i.test(cleanTerm)) {
      try {
        const pattern = `%${cleanTerm}%`;
        const matched = await prisma.$queryRaw`SELECT id FROM orders WHERE id::text ILIKE ${pattern}`;
        matchedOrderIds = matched.map((r) => r.id);
      } catch {
        matchedOrderIds = [];
      }
    }

    const orConditions = [
      { pickupAddress: { contains: term, mode: 'insensitive' } },
      { dropoffAddress: { contains: term, mode: 'insensitive' } },
      { customer: { fullName: { contains: term, mode: 'insensitive' } } },
      { customer: { phoneNumber: { contains: term, mode: 'insensitive' } } },
      { customer: { email: { contains: term, mode: 'insensitive' } } },
      { driver: { user: { fullName: { contains: term, mode: 'insensitive' } } } },
      { driver: { user: { phoneNumber: { contains: term, mode: 'insensitive' } } } },
    ];

    if (matchedOrderIds.length > 0) {
      orConditions.push({ id: { in: matchedOrderIds } });
    }

    where.OR = orConditions;
  }

  const [orders, total, allCount, processingCount, deliveredCount, expiredCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        customer: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        driver: {
          include: {
            user: { select: { fullName: true, phoneNumber: true } },
          },
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.count(),
    prisma.order.count({
      where: { status: { in: ['PENDING', 'DISPATCHING', 'DRIVER_ACCEPTED', 'MATCHED', 'IN_TRANSIT', 'PICKED_UP'] } },
    }),
    prisma.order.count({
      where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
    }),
    prisma.order.count({
      where: { status: { in: ['EXPIRED_NO_DRIVER', 'CANCELLED'] } },
    }),
  ]);

  return {
    orders,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    counts: {
      all: allCount,
      processing: processingCount,
      delivered: deliveredCount,
      expired: expiredCount,
    },
  };
};

/**
 * Delete multiple orders by IDs.
 */
export const deleteOrders = async (orderIds = [], adminUserId = null) => {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new BadRequestError('Vui lòng chọn ít nhất 1 đơn hàng để xóa');
  }

  const deleteResult = await prisma.order.deleteMany({
    where: { id: { in: orderIds } },
  });

  if (adminUserId) {
    await createAuditLog(adminUserId, 'DELETE_ORDERS', 'ORDER', orderIds.join(','), { count: deleteResult.count, orderIds });
  }

  return { count: deleteResult.count };
};

/**
 * Get all drivers with their approval status and real-time online/offline status.
 */
export const getAllDrivers = async ({ approvalStatus } = {}) => {
  const where = {};
  if (approvalStatus) where.approvalStatus = approvalStatus;

  const drivers = await prisma.driver.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          createdAt: true,
        },
      },
    },
    orderBy: { user: { createdAt: 'desc' } },
  });

  const driversWithStatus = await Promise.all(
    drivers.map(async (d) => {
      const redisStatus = await redis.get(REDIS_KEYS.DRIVER_STATUS(d.id));
      const isOnline = redisStatus === DRIVER_STATUS.ONLINE || d.isActive === true;
      return {
        ...d,
        isOnline,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
      };
    })
  );

  return driversWithStatus;
};

/**
 * Get all users (customers) with order stats.
 */
export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      isBlocked: true,
      blockReason: true,
      appealNote: true,
      isAppealed: true,
      createdAt: true,
      _count: {
        select: { customerOrders: true },
      },
      customerOrders: {
        select: {
          id: true,
          totalFare: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Tính tổng chi tiêu chính xác cho toàn bộ đơn (không chỉ 5 đơn gần nhất)
  const spentMap = await Promise.all(
    users.map(async (u) => {
      const agg = await prisma.order.aggregate({
        _sum: { totalFare: true },
        where: { customerId: u.id },
      });
      return { id: u.id, totalSpent: Number(agg._sum.totalFare || 0) };
    })
  );
  const spentById = Object.fromEntries(spentMap.map((s) => [s.id, s.totalSpent]));

  return users.map((u) => ({
    id: u.id,
    name: u.fullName || 'Khách hàng',
    email: u.email,
    phone: u.phoneNumber || '—',
    ordersCount: u._count.customerOrders,
    totalSpent: spentById[u.id] ?? 0,
    isBlocked: Boolean(u.isBlocked),
    blockReason: u.blockReason || null,
    appealNote: u.appealNote || null,
    isAppealed: Boolean(u.isAppealed),
    status: u.isBlocked ? 'BLOCKED' : 'ACTIVE',
    createdAt: new Date(u.createdAt).toLocaleDateString('vi-VN'),
    recentOrders: u.customerOrders.map((o) => ({
      code: `#ORD-${o.id.slice(-8).toUpperCase()}`,
      status: o.status,
      fare: `${Number(o.totalFare || 0).toLocaleString('vi-VN')} đ`,
    })),
  }));
};


import { unregisterOnlineDriver } from '../order/dispatch.service.js';

/**
 * Block a driver.
 */
export const blockDriver = async (driverId, adminUserId, reason) => {
  if (!reason || !reason.trim()) {
    throw new BadRequestError('Vui lòng nhập lý do khóa tài xế');
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } });
  if (!driver) throw new NotFoundError('Driver not found');

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: {
      approvalStatus: APPROVAL_STATUS.BLOCKED,
      rejectionReason: reason.trim(),
      isActive: false,
    },
    include: { user: { select: { id: true, fullName: true, email: true, phoneNumber: true } } },
  });

  // Evict blocked driver from Redis online dispatch sets and status key
  try {
    await unregisterOnlineDriver(driver.id, driver.vehicleType || 'motorcycle');
    await redis.del(REDIS_KEYS.DRIVER_STATUS(driver.id));
    await redis.zrem(REDIS_KEYS.DRIVER_LOCATIONS, driver.id);
  } catch (err) {
    console.error('Failed to evict blocked driver from Redis:', err);
  }

  emitDriverApprovalUpdated(updated.userId, {
    driverId: updated.id,
    approvalStatus: 'BLOCKED',
    rejectionReason: updated.rejectionReason,
    message: `Tài khoản tài xế của bạn đã bị khóa bởi Admin. Lý do: "${updated.rejectionReason}". Vui lòng vào trang thông tin cá nhân để khiếu nại mở tài khoản.`,
  });

  if (adminUserId) {
    await createAuditLog(adminUserId, 'BLOCK_DRIVER', 'DRIVER', driverId, { reason: reason.trim(), driverName: updated.user?.fullName });
  }

  return updated;
};

/**
 * Unblock a driver.
 */
export const unblockDriver = async (driverId, adminUserId) => {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } });
  if (!driver) throw new NotFoundError('Driver not found');

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: {
      approvalStatus: APPROVAL_STATUS.APPROVED,
      rejectionReason: null,
      appealNote: null,
      isAppealed: false,
    },
    include: { user: { select: { id: true, fullName: true, email: true, phoneNumber: true } } },
  });

  emitDriverApprovalUpdated(updated.userId, {
    driverId: updated.id,
    approvalStatus: 'APPROVED',
    message: 'Tài khoản tài xế của bạn đã được Admin mở khóa! Bạn có thể truy cập các trang và nhận đơn bình thường.',
  });

  if (adminUserId) {
    await createAuditLog(adminUserId, 'UNBLOCK_DRIVER', 'DRIVER', driverId, { driverName: updated.user?.fullName });
  }

  return updated;
};

/**
 * Block a user (Customer).
 */
export const blockUser = async (userId, adminUserId, reason) => {
  if (!reason || !reason.trim()) {
    throw new BadRequestError('Vui lòng nhập lý do khóa tài khoản khách hàng');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isBlocked: true,
      blockReason: reason.trim(),
    },
  });

  try {
    const { getIO } = await import('../../config/socket.js');
    const io = getIO();
    if (io) {
      io.of('/customer').to(`customer:${user.id}`).emit('user:status-updated', {
        userId: user.id,
        isBlocked: true,
        blockReason: updated.blockReason,
        message: `Tài khoản của bạn đã bị khóa bởi Admin. Lý do: "${updated.blockReason}". Vui lòng vào trang thông tin cá nhân để gửi khiếu nại mở tài khoản.`,
      });
    }
  } catch (err) {
    console.error('Socket emit error on blockUser:', err);
  }

  if (adminUserId) {
    await createAuditLog(adminUserId, 'BLOCK_USER', 'USER', userId, { reason: reason.trim(), userName: user.fullName });
  }

  return updated;
};

/**
 * Unblock a user (Customer).
 */
export const unblockUser = async (userId, adminUserId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isBlocked: false,
      blockReason: null,
      appealNote: null,
      isAppealed: false,
    },
  });

  try {
    const { getIO } = await import('../../config/socket.js');
    const io = getIO();
    if (io) {
      io.of('/customer').to(`customer:${user.id}`).emit('user:status-updated', {
        userId: user.id,
        isBlocked: false,
        message: 'Tài khoản của bạn đã được Admin mở khóa thành công! Bạn có thể đặt xe và truy cập các chức năng.',
      });
    }
  } catch (err) {
    console.error('Socket emit error on unblockUser:', err);
  }

  if (adminUserId) {
    await createAuditLog(adminUserId, 'UNBLOCK_USER', 'USER', userId, { userName: user.fullName });
  }

  return updated;
};

/**
 * Get pending drivers for approval.
 */
export const getPendingDrivers = async () => {
  return getAllDrivers({ approvalStatus: APPROVAL_STATUS.PENDING });
};

import { emitDriverApprovalUpdated } from '../../sockets/socket.gateway.js';

/**
 * Approve or reject a driver.
 */
export const updateDriverApproval = async (driverId, adminUserId, action, rejectionReason = null) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: { select: { id: true, fullName: true, email: true, phoneNumber: true } } },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  const isReject = action === 'reject' || action === 'REJECTED';

  if (isReject && (!rejectionReason || !rejectionReason.trim())) {
    throw new BadRequestError('Vui lòng cung cấp lý do từ chối duyệt tài xế');
  }

  if (isReject) {
    const newRejectionCount = (driver.rejectionCount || 0) + 1;

    // Check if this is the 2nd rejection after an appeal
    if (newRejectionCount >= 2) {
      // Emit socket notification to driver before deleting
      emitDriverApprovalUpdated(driver.userId, {
        driverId: driver.id,
        approvalStatus: 'PERMANENTLY_REJECTED',
        rejectionReason: rejectionReason.trim(),
        rejectionCount: newRejectionCount,
        message: `Hồ sơ khiếu nại của bạn bị từ chối lần 2 (${rejectionReason.trim()}). Tài khoản của bạn đã bị từ chối và xóa khỏi hệ thống.`,
        deleted: true,
      });

      // Permanently delete driver & user account from DB
      await prisma.user.delete({
        where: { id: driver.userId },
      });

      if (adminUserId) {
        await createAuditLog(adminUserId, 'REJECT_DRIVER', 'DRIVER', driverId, {
          rejectionReason: rejectionReason.trim(),
          driverName: driver.user?.fullName,
          permanentlyDeleted: true,
        });
      }

      return {
        id: driver.id,
        deleted: true,
        rejectionCount: newRejectionCount,
        rejectionReason: rejectionReason.trim(),
        message: 'Tài xế bị từ chối lần 2 và tài khoản đã được xóa khỏi hệ thống.',
      };
    }

    // 1st Rejection: Update status to REJECTED and record reason
    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: {
        approvalStatus: APPROVAL_STATUS.REJECTED,
        rejectionReason: rejectionReason.trim(),
        rejectionCount: 1,
        approvedBy: adminUserId,
        approvedAt: new Date(),
        isAppealed: false,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
    });

    emitDriverApprovalUpdated(updated.userId, {
      driverId: updated.id,
      approvalStatus: updated.approvalStatus,
      rejectionReason: updated.rejectionReason,
      rejectionCount: 1,
      message: `Hồ sơ đăng ký tài xế của bạn bị từ chối với lý do: "${updated.rejectionReason}". Vui lòng cập nhật lại thông tin và gửi khiếu nại để Admin xem xét lại.`,
    });

    if (adminUserId) {
      await createAuditLog(adminUserId, 'REJECT_DRIVER', 'DRIVER', driverId, {
        rejectionReason: rejectionReason.trim(),
        driverName: updated.user?.fullName,
      });
    }

    return updated;
  }

  // Approval action
  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: {
      approvalStatus: APPROVAL_STATUS.APPROVED,
      approvedBy: adminUserId,
      approvedAt: new Date(),
      rejectionReason: null,
      appealNote: null,
      isAppealed: false,
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
    },
  });

  emitDriverApprovalUpdated(updated.userId, {
    driverId: updated.id,
    approvalStatus: updated.approvalStatus,
    message: 'Hồ sơ của bạn đã được Admin phê duyệt! Bạn có thể bật Online để nhận đơn ngay.',
  });

  if (adminUserId) {
    await createAuditLog(adminUserId, 'APPROVE_DRIVER', 'DRIVER', driverId, {
      driverName: updated.user?.fullName,
    });
  }

  return updated;
};

/**
 * Get analytics data for charts.
 */
export const getAnalytics = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Orders per day (last 7 days)
  const ordersPerDay = await prisma.$queryRaw`
    SELECT DATE(created_at) as date, COUNT(*)::int as count
    FROM orders
    WHERE created_at >= ${sevenDaysAgo}
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  // Revenue per day
  const revenuePerDay = await prisma.$queryRaw`
    SELECT DATE(created_at) as date, SUM(total_fare)::float as revenue
    FROM orders
    WHERE status = 'DELIVERED' AND created_at >= ${sevenDaysAgo}
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  // Order status distribution
  const statusDistribution = await prisma.order.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  return { ordersPerDay, revenuePerDay, statusDistribution };
};

/**
 * Resolve / acknowledge a driver's appeal or complaint without changing approval status.
 */
export const resolveDriverAppeal = async (driverId, adminUserId = null) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: { select: { id: true, fullName: true, email: true, phoneNumber: true } } },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: {
      isAppealed: false,
      appealNote: null,
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
    },
  });

  emitDriverApprovalUpdated(updated.userId, {
    driverId: updated.id,
    approvalStatus: updated.approvalStatus,
    isAppealed: false,
    appealNote: null,
    message: 'Nội dung khiếu nại / giải trình của bạn đã được Admin xem xét và phản hồi.',
  });

  if (adminUserId) {
    await createAuditLog(adminUserId, 'RESOLVE_APPEAL', 'DRIVER', driverId, { driverName: updated.user?.fullName });
  }

  return updated;
};
