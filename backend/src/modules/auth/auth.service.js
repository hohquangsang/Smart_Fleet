import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database.js';
import env from '../../config/env.js';
import { UnauthorizedError, ConflictError, BadRequestError, NotFoundError } from '../../utils/api-error.js';
import { ROLES, APPROVAL_STATUS } from '../../utils/constants.js';
import { emitAdminNewDriverRegistered } from '../../sockets/socket.gateway.js';
import { generateAndStoreOtp, verifyOtp, issueResetToken, verifyAndConsumeResetToken, getResendCooldown } from '../../services/otp.service.js';
import { sendOtpEmail } from '../../services/email.service.js';

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
    isBlocked: Boolean(user.isBlocked),
    blockReason: user.blockReason || null,
    appealNote: user.appealNote || null,
    isAppealed: Boolean(user.isAppealed),
  };

  if (createdDriver) {
    responseUser.driver = {
      id: createdDriver.id,
      vehicleType: createdDriver.vehicleType,
      licensePlate: createdDriver.licensePlate,
      licenseImage: createdDriver.licenseImage || null,
      cccdImage: createdDriver.cccdImage || null,
      approvalStatus: createdDriver.approvalStatus,
      rejectionReason: createdDriver.rejectionReason || null,
      rejectionCount: createdDriver.rejectionCount || 0,
      appealNote: createdDriver.appealNote || null,
      isAppealed: Boolean(createdDriver.isAppealed),
      rating: createdDriver.rating || 5.0,
      isActive: createdDriver.isActive || false,
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
      isBlocked: Boolean(user.isBlocked),
      blockReason: user.blockReason || null,
      appealNote: user.appealNote || null,
      isAppealed: Boolean(user.isAppealed),
    },
    ...tokens,
  };

  // Include driver info if applicable
  if (user.driver) {
    response.user.driver = {
      id: user.driver.id,
      vehicleType: user.driver.vehicleType,
      licensePlate: user.driver.licensePlate,
      licenseImage: user.driver.licenseImage || null,
      cccdImage: user.driver.cccdImage || null,
      approvalStatus: user.driver.approvalStatus,
      rejectionReason: user.driver.rejectionReason || null,
      rejectionCount: user.driver.rejectionCount || 0,
      appealNote: user.driver.appealNote || null,
      isAppealed: Boolean(user.driver.isAppealed),
      rating: user.driver.rating || 5.0,
      isActive: user.driver.isActive || false,
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

// ─── Forgot Password (3 bước) ─────────────────────────────────────────────

/**
 * Bước 1: Kiểm tra email tồn tại, tạo OTP và gửi qua nodemailer.
 *
 * @param {string} email
 */
export const sendForgotPasswordOtp = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new NotFoundError('Email này không tồn tại trong hệ thống. Vui lòng kiểm tra lại.');
  }

  // Kiểm tra cooldown: chắn gửi lại quá nhanh (< 60 giây giữa các lần)
  const cooldownSeconds = await getResendCooldown(email);
  if (cooldownSeconds > 0) {
    throw new BadRequestError(
      `Vui lòng chờ ${cooldownSeconds} giây trước khi gửi lại OTP.`,
      { cooldownSeconds }
    );
  }

  const otp = await generateAndStoreOtp(email);

  // Await gửi email — để lỗi thật sự được trả về client thay vì âm thầm
  try {
    await sendOtpEmail(email, user.fullName, otp);
  } catch (emailErr) {
    console.error('[ForgotPassword] Gửi email thất bại:', emailErr.message);
    throw new BadRequestError('Không thể gửi email OTP. Vui lòng kiểm tra địa chỉ email hoặc thử lại sau.');
  }

  return { message: 'OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.' };
};

/**
 * Bước 2: Xác minh OTP người dùng nhập – trả về reset token nếu đúng.
 *
 * @param {string} email
 * @param {string} otp
 * @returns {{ resetToken: string }}
 */
export const verifyForgotPasswordOtp = async (email, otp) => {
  const result = await verifyOtp(email, otp);

  if (!result.valid) {
    throw new BadRequestError(result.reason);
  }

  // OTP hợp lệ → phát hành reset token dùng một lần (hết hạn 15 phút)
  const resetToken = await issueResetToken(email);

  return { resetToken, message: 'OTP hợp lệ. Hãy đặt mật khẩu mới trong 15 phút.' };
};

/**
 * Bước 3: Xác minh reset token và cập nhật mật khẩu mới.
 *
 * @param {string} email
 * @param {string} resetToken
 * @param {string} newPassword
 */
export const resetPassword = async (email, resetToken, newPassword) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new NotFoundError('Không tìm thấy tài khoản với email này');
  }

  const isTokenValid = await verifyAndConsumeResetToken(email, resetToken);
  if (!isTokenValid) {
    throw new BadRequestError('Reset token không hợp lệ hoặc đã hết hạn. Vui lòng thực hiện lại từ bước 1.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  return { message: 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.' };
};
