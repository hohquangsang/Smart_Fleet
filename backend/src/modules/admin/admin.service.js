import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import { NotFoundError, BadRequestError } from '../../utils/api-error.js';
import { APPROVAL_STATUS, ORDER_STATUS, REDIS_KEYS, DRIVER_STATUS } from '../../utils/constants.js';

/**
 * Get dashboard statistics.
 */
export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalOrdersToday,
    totalOrders,
    totalDrivers,
    activeDrivers,
    pendingDrivers,
    deliveredToday,
    revenueToday,
    avgDeliveryTime,
    totalUsers,
  ] = await Promise.all([
    // Orders today
    prisma.order.count({
      where: { createdAt: { gte: today } },
    }),
    // Total orders
    prisma.order.count(),
    // Total drivers
    prisma.driver.count(),
    // Active (online) drivers
    prisma.driver.count({
      where: { isActive: true, approvalStatus: APPROVAL_STATUS.APPROVED },
    }),
    // Pending approval
    prisma.driver.count({
      where: { approvalStatus: APPROVAL_STATUS.PENDING },
    }),
    // Delivered today
    prisma.order.count({
      where: {
        status: ORDER_STATUS.DELIVERED,
        createdAt: { gte: today },
      },
    }),
    // Revenue today
    prisma.order.aggregate({
      _sum: { totalFare: true },
      where: {
        status: ORDER_STATUS.DELIVERED,
        createdAt: { gte: today },
      },
    }),
    // Avg delivery time (using AI ETA as proxy)
    prisma.order.aggregate({
      _avg: { aiEtaMin: true, baseEtaMin: true },
      where: { status: ORDER_STATUS.DELIVERED },
    }),
    // Total Users (customers)
    prisma.user.count({
      where: { role: 'CUSTOMER' },
    }),
  ]);

  return {
    totalOrdersToday,
    totalOrders,
    totalDrivers,
    activeDrivers,
    pendingDrivers,
    deliveredToday,
    totalUsers,
    revenueToday: revenueToday._sum.totalFare || 0,
    avgDeliveryTimeMin: Math.round(avgDeliveryTime._avg.aiEtaMin || avgDeliveryTime._avg.baseEtaMin || 0),
  };
};

/**
 * Get all orders with filters and pagination.
 */
export const getAllOrders = async ({ page = 1, limit = 20, status, search } = {}) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { pickupAddress: { contains: search, mode: 'insensitive' } },
      { dropoffAddress: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
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
  ]);

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  return users.map((u) => {
    const totalSpent = u.customerOrders.reduce((sum, o) => sum + (o.totalFare || 0), 0);
    return {
      id: u.id,
      name: u.fullName || 'Khách hàng',
      email: u.email,
      phone: u.phoneNumber || '—',
      ordersCount: u._count.customerOrders,
      totalSpent,
      status: 'ACTIVE',
      createdAt: new Date(u.createdAt).toLocaleDateString('vi-VN'),
      recentOrders: u.customerOrders.map((o) => ({
        code: `#ORD-${o.id.slice(-8).toUpperCase()}`,
        status: o.status,
        fare: `${Number(o.totalFare || 0).toLocaleString('vi-VN')} đ`,
      })),
    };
  });
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
export const updateDriverApproval = async (driverId, adminUserId, action) => {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: { select: { fullName: true } } },
  });

  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  if (driver.approvalStatus !== APPROVAL_STATUS.PENDING) {
    throw new BadRequestError(`Driver has already been ${driver.approvalStatus.toLowerCase()}`);
  }

  const newStatus = action === 'approve'
    ? APPROVAL_STATUS.APPROVED
    : APPROVAL_STATUS.REJECTED;

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: {
      approvalStatus: newStatus,
      approvedBy: adminUserId,
      approvedAt: new Date(),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
    },
  });

  // Emit real-time socket event to driver
  emitDriverApprovalUpdated(updated.userId, {
    driverId: updated.id,
    approvalStatus: updated.approvalStatus,
    message: newStatus === APPROVAL_STATUS.APPROVED
      ? 'Hồ sơ của bạn đã được Admin phê duyệt! Bạn có thể bật Online để nhận đơn ngay.'
      : 'Hồ sơ đăng ký tài xế của bạn đã bị từ chối.',
  });

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
