import nodemailer from 'nodemailer';
import env from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Send an email with optional PDF attachment.
 *
 * @param {object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.attachmentPath] - Path to file to attach
 * @param {string} [options.attachmentName] - Filename for attachment
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
