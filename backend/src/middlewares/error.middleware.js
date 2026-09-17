import { AppError } from '../utils/api-error.js';

/**
 * Global error handling middleware.
 * Catches all errors passed via next(error) and returns consistent JSON responses.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, _req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi máy chủ nội bộ';
  let details = err.details || null;
  let isOperational = err.isOperational || false;

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target;
    const targetStr = Array.isArray(target) ? target.join(', ') : String(target || '');
    if (targetStr.includes('email')) {
      message = 'Email này đã được đăng ký trên hệ thống.';
    } else if (targetStr.includes('phone')) {
      message = 'Số điện thoại này đã được đăng ký trên hệ thống.';
    } else if (targetStr.includes('license')) {
      message = 'Biển số xe này đã được đăng ký trên hệ thống.';
    } else {
      message = `Dữ liệu đã tồn tại: ${targetStr}`;
    }
    isOperational = true;
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Không tìm thấy dữ liệu yêu cầu';
    isOperational = true;
  }

  // Log unexpected errors
  if (!isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
};

export default errorMiddleware;
