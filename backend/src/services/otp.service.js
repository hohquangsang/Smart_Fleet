import crypto from 'crypto';
import redis from '../config/redis.js';

// ─── Redis key prefixes ──────────────────────────────────────────────────────
const OTP_KEY_PREFIX      = 'otp:forgot:';
const TOKEN_KEY_PREFIX    = 'reset_token:';
const ATTEMPTS_KEY_PREFIX = 'otp_attempts:';
const COOLDOWN_KEY_PREFIX = 'otp_cooldown:'; // chống gửi quá nhanh liên tục

// ─── Cấu hình thời gian ──────────────────────────────────────────────────────
const OTP_TTL_SECONDS      = 1 * 60;  // OTP hết hạn sau 1 phút
const TOKEN_TTL_SECONDS    = 10 * 60; // Reset token hết hạn sau 10 phút
const MAX_OTP_ATTEMPTS     = 5;       // Tối đa 5 lần nhập sai OTP
const ATTEMPTS_TTL_SECONDS = 10 * 60; // Window đếm số lần thử
const COOLDOWN_SECONDS     = 60;      // Phải chờ 60s mới được gửi lại OTP

/**
 * Kiểm tra xem email có đang trong cooldown không.
 * Nếu có, trả về số giây còn lại. Nếu không, trả về 0.
 *
 * @param {string} email
 * @returns {Promise<number>} số giây còn lại (0 = không bị chặn)
 */
export const getResendCooldown = async (email) => {
  const cooldownKey = `${COOLDOWN_KEY_PREFIX}${email}`;
  const ttl = await redis.ttl(cooldownKey); // -2 nếu key không tồn tại, -1 nếu không có TTL
  return ttl > 0 ? ttl : 0;
};

/**
 * Tạo OTP ngẫu nhiên 6 chữ số và lưu vào Redis.
 * Mỗi lần gọi sẽ xoá OTP cũ, reset số lần thử, và đặt cooldown mới.
 *
 * @param {string} email
 * @returns {string} otp
 */
export const generateAndStoreOtp = async (email) => {
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  const otpKey      = `${OTP_KEY_PREFIX}${email}`;
  const attemptsKey = `${ATTEMPTS_KEY_PREFIX}${email}`;
  const cooldownKey = `${COOLDOWN_KEY_PREFIX}${email}`;

  await Promise.all([
    redis.set(otpKey, otp, 'EX', OTP_TTL_SECONDS),
    redis.del(attemptsKey),                               // reset bộ đếm thử sai
    redis.set(cooldownKey, '1', 'EX', COOLDOWN_SECONDS), // đặt cooldown 60s
  ]);

  return otp;
};

/**
 * Xác minh OTP người dùng nhập.
 *
 * @param {string} email
 * @param {string} inputOtp
 * @returns {{ valid: boolean, reason?: string }}
 */
export const verifyOtp = async (email, inputOtp) => {
  const otpKey      = `${OTP_KEY_PREFIX}${email}`;
  const attemptsKey = `${ATTEMPTS_KEY_PREFIX}${email}`;

  const [storedOtp, attempts] = await Promise.all([
    redis.get(otpKey),
    redis.get(attemptsKey),
  ]);

  if (!storedOtp) {
    return { valid: false, reason: 'OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại.' };
  }

  const currentAttempts = parseInt(attempts || '0', 10);
  if (currentAttempts >= MAX_OTP_ATTEMPTS) {
    await redis.del(otpKey); // xoá luôn OTP để buộc gửi lại
    return { valid: false, reason: 'Quá nhiều lần thử sai. Vui lòng yêu cầu OTP mới.' };
  }

  if (storedOtp !== inputOtp) {
    await redis.set(attemptsKey, currentAttempts + 1, 'EX', ATTEMPTS_TTL_SECONDS);
    const remaining = MAX_OTP_ATTEMPTS - (currentAttempts + 1);
    return {
      valid: false,
      reason: `OTP không đúng. Còn ${remaining} lần thử.`,
    };
  }

  // OTP đúng → xoá OTP & bộ đếm (giữ cooldown để tránh spam)
  await Promise.all([redis.del(otpKey), redis.del(attemptsKey)]);
  return { valid: true };
};

/**
 * Phát hành reset token (hex ngẫu nhiên 32 bytes) sau khi OTP hợp lệ.
 * Token này dùng cho bước 3 đặt lại mật khẩu, hết hạn sau TOKEN_TTL_SECONDS.
 *
 * @param {string} email
 * @returns {string} resetToken
 */
export const issueResetToken = async (email) => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenKey   = `${TOKEN_KEY_PREFIX}${email}`;

  await redis.set(tokenKey, resetToken, 'EX', TOKEN_TTL_SECONDS);
  return resetToken;
};

/**
 * Xác minh reset token và xoá sau khi dùng (one-time use).
 *
 * @param {string} email
 * @param {string} token
 * @returns {boolean}
 */
export const verifyAndConsumeResetToken = async (email, token) => {
  const tokenKey    = `${TOKEN_KEY_PREFIX}${email}`;
  const storedToken = await redis.get(tokenKey);

  if (!storedToken || storedToken !== token) {
    return false;
  }

  await redis.del(tokenKey); // xoá token sau khi dùng một lần
  return true;
};
