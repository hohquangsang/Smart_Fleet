/**
 * Test script: gửi 3 OTP email liên tiếp đến cùng một địa chỉ
 * để xác nhận pool transporter hoạt động đúng.
 *
 * Chạy: node src/tests/test-otp-email.js
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// Test gửi đến chính tài khoản SMTP (self-send)
const TEST_TO = SMTP_USER;

const otpTransporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 3,
  maxMessages: Infinity,
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 30000,
});

async function sendTestOtp(round) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`\n[Round ${round}] Sending OTP ${otp} to ${TEST_TO}…`);

  const start = Date.now();
  try {
    const info = await otpTransporter.sendMail({
      from: `"SmartFleet Test" <${SMTP_USER}>`,
      to: TEST_TO,
      subject: `[Test Round ${round}] OTP ${otp}`,
      text: `OTP: ${otp}`,
    });
    console.log(`[Round ${round}] SUCCESS (${Date.now() - start}ms) — messageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[Round ${round}] FAILED (${Date.now() - start}ms) — ${err.message}`);
  }
}

(async () => {
  console.log('=== OTP Email Pool Test ===');
  console.log(`SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
  console.log(`FROM: ${SMTP_USER}`);
  console.log(`TO:   ${TEST_TO}`);

  // Gửi 3 lần với delay 2s giữa mỗi lần
  for (let i = 1; i <= 3; i++) {
    await sendTestOtp(i);
    if (i < 3) {
      console.log('[Waiting 2s before next round…]');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  otpTransporter.close();
  console.log('\n=== Test completed ===');
  process.exit(0);
})();
