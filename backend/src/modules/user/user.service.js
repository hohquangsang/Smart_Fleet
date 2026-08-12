import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/api-error.js';

/**
 * Get user profile by ID, including driver info if applicable.
 */
export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      phoneNumber: true,
      avatar: true,
      cccdImage: true,
      isBlocked: true,
      blockReason: true,
      appealNote: true,
      isAppealed: true,
      createdAt: true,
      driver: {
        select: {
          id: true,
          vehicleType: true,
          licensePlate: true,
          licenseImage: true,
          cccdImage: true,
          rating: true,
          isActive: true,
          approvalStatus: true,
          rejectionReason: true,
          rejectionCount: true,
          appealNote: true,
          isAppealed: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

/**
 * Submit an appeal for a blocked user (Customer) to Admin.
 */
export const submitUserAppeal = async (userId, appealNote) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      isAppealed: true,
      appealNote: appealNote ? appealNote.trim() : 'Khách hàng đã gửi yêu cầu mở khóa tài khoản.',
    },
  });

  try {
    const { getIO } = await import('../../config/socket.js');
    const io = getIO();
    if (io) {
      io.of('/admin').to('admin:notifications').emit('admin:user-appealed', {
        userId: updatedUser.id,
        userName: updatedUser.fullName,
        phoneNumber: updatedUser.phoneNumber,
        appealNote: updatedUser.appealNote,
        blockReason: updatedUser.blockReason,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Socket emit error on submitUserAppeal:', err);
  }

  return getProfile(userId);
};

/**
 * Update user profile & driver details.
 */
export const updateProfile = async (userId, data) => {
  const { email, phoneNumber, fullName, password, avatar, cccdImage, vehicleType, licensePlate, licenseImage } = data;

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { driver: true },
  });

  if (!currentUser) {
    throw new NotFoundError('User not found');
  }

  // Check email uniqueness if changing
  if (email && email !== currentUser.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictError('Email này đã được sử dụng bởi tài khoản khác');
    }
  }

  // Check phone number uniqueness if changing
  if (phoneNumber && phoneNumber !== currentUser.phoneNumber) {
    const existingPhone = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingPhone) {
      throw new ConflictError('Số điện thoại này đã được sử dụng bởi tài khoản khác');
    }
  }

  // Check license plate uniqueness if changing
  if (licensePlate && currentUser.driver && licensePlate !== currentUser.driver.licensePlate) {
    const existingPlate = await prisma.driver.findUnique({ where: { licensePlate } });
    if (existingPlate) {
      throw new ConflictError('Biển số xe này đã được đăng ký bởi tài xế khác');
    }
  }

  const updateUserData = {};
  if (fullName !== undefined) updateUserData.fullName = fullName;
  if (phoneNumber !== undefined) updateUserData.phoneNumber = phoneNumber;
  if (email !== undefined) updateUserData.email = email;
  if (avatar !== undefined) updateUserData.avatar = avatar;
  if (cccdImage !== undefined) updateUserData.cccdImage = cccdImage;
  if (password) {
    updateUserData.passwordHash = await bcrypt.hash(password, 12);
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateUserData,
  });

  // Update driver details if user is DRIVER or has driver profile
  if (currentUser.driver || currentUser.role === 'DRIVER') {
    const updateDriverData = {};
    if (vehicleType !== undefined) updateDriverData.vehicleType = vehicleType;
    if (licensePlate !== undefined) updateDriverData.licensePlate = licensePlate;
    if (licenseImage !== undefined) updateDriverData.licenseImage = licenseImage;
    if (cccdImage !== undefined) updateDriverData.cccdImage = cccdImage;

    if (Object.keys(updateDriverData).length > 0) {
      if (currentUser.driver) {
        await prisma.driver.update({
          where: { userId },
          data: updateDriverData,
        });
      } else {
        await prisma.driver.create({
          data: {
            userId,
            vehicleType: vehicleType || 'motorcycle',
            licensePlate: licensePlate || `51K-${Math.floor(10000 + Math.random() * 90000)}`,
            ...updateDriverData,
          },
        });
      }
    }
  }

  return getProfile(userId);
};

/**
 * Register to become a Driver (Customer submitting driver application).
 */
export const registerDriver = async (userId, data) => {
  const { vehicleType, licensePlate, licenseImage, cccdImage } = data;

  if (!vehicleType || !licensePlate) {
    throw new BadRequestError('Vui lòng nhập đầy đủ loại phương tiện và biển số xe');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driver: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.driver && user.driver.approvalStatus === 'APPROVED') {
    throw new BadRequestError('Tài khoản của bạn đã là tài xế đã được phê duyệt');
  }

  const cleanPlate = licensePlate.trim().toUpperCase();
  const existingPlate = await prisma.driver.findUnique({
    where: { licensePlate: cleanPlate },
  });

  if (existingPlate && existingPlate.userId !== userId) {
    throw new ConflictError('Biển số xe này đã được đăng ký bởi một tài xế khác');
  }

  let driver;
  if (user.driver) {
    driver = await prisma.driver.update({
      where: { userId },
      data: {
        vehicleType: vehicleType.trim(),
        licensePlate: cleanPlate,
        licenseImage: licenseImage || user.driver.licenseImage || null,
        cccdImage: cccdImage || user.driver.cccdImage || user.cccdImage || null,
        approvalStatus: 'PENDING',
        rejectionReason: null,
        isAppealed: false,
        appealNote: null,
      },
    });
  } else {
    driver = await prisma.driver.create({
      data: {
        userId,
        vehicleType: vehicleType.trim(),
        licensePlate: cleanPlate,
        licenseImage: licenseImage || null,
        cccdImage: cccdImage || user.cccdImage || null,
        approvalStatus: 'PENDING',
      },
    });
  }

  if (cccdImage) {
    await prisma.user.update({
      where: { id: userId },
      data: { cccdImage },
    });
  }

  // Emit Socket.IO notification to Admin namespace
  try {
    const { getIO } = await import('../../config/socket.js');
    const io = getIO();
    if (io) {
      io.of('/admin').emit('admin:new-driver-registered', {
        driverId: driver.id,
        userId: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        vehicleType: driver.vehicleType,
        licensePlate: driver.licensePlate,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Failed to emit socket event on driver registration:', err);
  }

  return getProfile(userId);
};
