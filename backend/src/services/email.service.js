import nodemailer from 'nodemailer';
import env from '../config/env.js';

// ─── Transporter cho email thông thường (invoice, v.v.) ──────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ─── Transporter riêng cho OTP email ─────────────────────────────────────────
// Dùng pool: true để nodemailer tự động:
//   • Quản lý connection pool (tái sử dụng connection thay vì đóng/mở mỗi lần)
//   • Tự reconnect khi connection bị Gmail đóng sau idle timeout
//   • Không cần gọi .close() thủ công sau mỗi lần gửi
// Đây là cách duy nhất đảm bảo gửi được nhiều lần liên tiếp với Gmail SMTP.
const otpTransporter = nodemailer.createTransport({
  pool: true,           // Bật connection pooling
  maxConnections: 3,    // Giữ tối đa 3 connections song song
  maxMessages: Infinity, // Không giới hạn số email trên mỗi connection
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,        // STARTTLS (port 587)
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Tránh lỗi TLS certificate trong môi trường dev
  },
  connectionTimeout: 15000, // 15s để thiết lập kết nối
  greetingTimeout:   10000, // 10s chờ SMTP greeting
  socketTimeout:     30000, // 30s idle trên socket (dài hơn để Gmail không close sớm)
});

// Log khi pool transporter sẵn sàng
otpTransporter.on('idle', () => {
  // Được kích hoạt khi có connection rảnh trong pool — bình thường
});

/**
 * Send an email with optional PDF attachment.
 */
export const sendEmail = async ({ to, subject, html, attachmentPath, attachmentName }) => {
  try {
    const mailOptions = {
      from: `"SmartFleet" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    if (attachmentPath) {
      mailOptions.attachments = [
        {
          filename: attachmentName || 'invoice.pdf',
          path: attachmentPath,
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send failed:', error.message);
    throw error;
  }
};

/**
 * Send invoice email to customer.
 */
export const sendInvoiceEmail = async (customerEmail, customerName, invoiceNumber, pdfPath) => {
  return sendEmail({
    to: customerEmail,
    subject: `SmartFleet Invoice #${invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">SmartFleet</h2>
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Your delivery has been completed successfully!</p>
        <p>Please find your invoice <strong>#${invoiceNumber}</strong> attached to this email.</p>
        <br/>
        <p style="color: #64748b; font-size: 12px;">
          Thank you for using SmartFleet. If you have any questions, please contact our support team.
        </p>
      </div>
    `,
    attachmentPath: pdfPath,
    attachmentName: `${invoiceNumber}.pdf`,
  });
};

/**
 * Gửi email OTP khôi phục mật khẩu.
 *
 * Dùng otpTransporter (pool mode) thay vì tạo freshTransporter mỗi lần.
 * Pool mode tự xử lý reconnect khi Gmail đóng connection → gửi được nhiều lần.
 *
 * @param {string} userEmail
 * @param {string} userName
 * @param {string} otp
 */
export const sendOtpEmail = async (userEmail, userName, otp) => {
  console.log(`[OTP Email] Attempting to send OTP to ${userEmail}…`);

  try {
    const info = await otpTransporter.sendMail({
      from: `"SmartFleet" <${env.SMTP_USER}>`,
      to: userEmail,
      subject: 'SmartFleet – Ma xac nhan khoi phuc mat khau',
      html: buildOtpHtml(userName, otp),
    });

    console.log(`[OTP Email] SUCCESS — ${userEmail} | messageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[OTP Email] FAILED — ${userEmail} | ${error.message}`);
    throw error;
  }
};

/** HTML template cho OTP email */
function buildOtpHtml(userName, otp) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Khoi phuc mat khau SmartFleet</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">SmartFleet</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;">He thong van chuyen thong minh</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;">
              Xin chao, <strong>${userName}</strong>!
            </h2>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              Chung toi nhan duoc yeu cau khoi phuc mat khau cho tai khoan cua ban.
              Su dung ma OTP ben duoi de tiep tuc:
            </p>

            <!-- OTP Box -->
            <div style="background:#eff6ff;border:2px dashed #3b82f6;border-radius:10px;
                        padding:28px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;
                         text-transform:uppercase;letter-spacing:1px;">
                Ma xac nhan cua ban
              </p>
              <span style="font-size:42px;font-weight:800;letter-spacing:10px;
                           color:#1e40af;font-family:monospace;">
                ${otp}
              </span>
              <p style="margin:12px 0 0;color:#ef4444;font-size:13px;">
                Ma co hieu luc trong <strong>1 phut</strong>
              </p>
            </div>

            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
              Neu ban khong thuc hien yeu cau nay, vui long bo qua email nay.
              Tai khoan cua ban van hoan toan an toan.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} SmartFleet. Moi quyen duoc bao luu.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
