import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database.js';
import env from '../../config/env.js';
import { UnauthorizedError, ConflictError, BadRequestError } from '../../utils/api-error.js';
import { ROLES, APPROVAL_STATUS } from '../../utils/constants.js';

import { emitAdminNewDriverRegistered } from '../../sockets/socket.gateway.js';

/**
 * Generate JWT access + refresh token pair.
 */
const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });

  return { accessToken, refreshToken };
};

/**
 * Register a new user (Customer or Driver).
 * Drivers start with approval_status = PENDING.
 */
export const register = async (data) => {
  const { email, password, fullName, phoneNumber, role, vehicleType, licensePlate } = data;

  // Check existing email
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('Email này đã được đăng ký');
  }

  // Check existing phone number
  const existingPhone = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existingPhone) {
    throw new ConflictError('Số điện thoại này đã được đăng ký');
  }

  // If registering as DRIVER, check vehicleType & licensePlate
  if (role === ROLES.DRIVER) {
    if (!vehicleType || !licensePlate) {
      throw new BadRequestError('Loại xe và biển số xe là bắt buộc đối với Tài xế');
    }

    const existingPlate = await prisma.driver.findUnique({ where: { licensePlate } });
    if (existingPlate) {
      throw new ConflictError('Biển số xe này đã được đăng ký');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user + driver (if DRIVER role) in a transaction
  let createdDriver = null;
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role,
        fullName,
        phoneNumber,
      },
    });

    if (role === ROLES.DRIVER) {
      createdDriver = await tx.driver.create({
        data: {
          userId: newUser.id,
          vehicleType,
          licensePlate,
          approvalStatus: APPROVAL_STATUS.PENDING,
        },
      });
    }

    return newUser;
  });

  if (createdDriver) {
    // Notify admin real-time about new pending driver registration
    emitAdminNewDriverRegistered({
      id: createdDriver.id,
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      vehicleType: createdDriver.vehicleType,
      licensePlate: createdDriver.licensePlate,
      approvalStatus: APPROVAL_STATUS.PENDING,
      createdAt: user.createdAt,
    });
  }

  const tokens = generateTokens(user);

  const responseUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
  };

  if (createdDriver) {
    responseUser.driver = {
      id: createdDriver.id,
      vehicleType: createdDriver.vehicleType,
      licensePlate: createdDriver.licensePlate,
      approvalStatus: createdDriver.approvalStatus,
      rating: createdDriver.rating || 5.0,
    };
  }

  return {
    user: responseUser,
    ...tokens,
  };
};

/**
 * Login with email + password.
 */
export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      driver: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new UnauthorizedError('Email hoặc mật khẩu không chính xác');
  }

  const tokens = generateTokens(user);

  const response = {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
    },
    ...tokens,
  };

  // Include driver info if applicable
  if (user.driver) {
    response.user.driver = {
      id: user.driver.id,
      vehicleType: user.driver.vehicleType,
      licensePlate: user.driver.licensePlate,
      approvalStatus: user.driver.approvalStatus,
      rating: user.driver.rating,
    };
  }

  return response;
};

/**
 * Refresh access token using a valid refresh token.
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokens = generateTokens(user);
    return tokens;
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    throw error;
  }
};
