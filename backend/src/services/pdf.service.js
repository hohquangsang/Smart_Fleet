import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate a PDF invoice for a completed order.
 *
 * @param {object} invoiceData
 * @param {string} invoiceData.invoiceNumber
 * @param {string} invoiceData.customerName
 * @param {string} invoiceData.customerEmail
 * @param {string} invoiceData.pickupAddress
 * @param {string} invoiceData.dropoffAddress
 * @param {number} invoiceData.distanceKm
 * @param {number} invoiceData.baseFare
 * @param {number} invoiceData.totalFare
 * @param {Date} invoiceData.issuedAt
 * @returns {Promise<string>} Path to generated PDF file
 */
export const generateInvoicePDF = (invoiceData) => {
  return new Promise((resolve, reject) => {
    const dir = path.resolve('invoices');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, `${invoiceData.invoiceNumber}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // ─── Header ────────────────────────────────
    doc
      .fontSize(28)
      .fillColor('#3b82f6')
      .text('SmartFleet', { align: 'center' })
      .moveDown(0.3);

    doc
      .fontSize(12)
      .fillColor('#64748b')
      .text('DELIVERY INVOICE', { align: 'center' })
      .moveDown(1.5);

    // ─── Invoice Details ───────────────────────
    doc.fontSize(10).fillColor('#333');

    const leftCol = 50;
    const rightCol = 350;

    doc.text(`Invoice Number:`, leftCol).text(invoiceData.invoiceNumber, rightCol, doc.y - 12);
    doc.moveDown(0.5);
    doc.text(`Date:`, leftCol).text(
      new Date(invoiceData.issuedAt).toLocaleDateString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
      rightCol, doc.y - 12
    );
    doc.moveDown(0.5);
    doc.text(`Customer:`, leftCol).text(invoiceData.customerName, rightCol, doc.y - 12);
    doc.moveDown(0.5);
    doc.text(`Email:`, leftCol).text(invoiceData.customerEmail, rightCol, doc.y - 12);
    doc.moveDown(1.5);

    // ─── Divider ───────────────────────────────
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#e2e8f0')
      .stroke();
    doc.moveDown(1);

    // ─── Trip Details ──────────────────────────
    doc.fontSize(14).fillColor('#1e293b').text('Trip Details').moveDown(0.5);
    doc.fontSize(10).fillColor('#333');

    doc.text(`Pickup:`, leftCol).text(invoiceData.pickupAddress, rightCol, doc.y - 12);
    doc.moveDown(0.5);
    doc.text(`Dropoff:`, leftCol).text(invoiceData.dropoffAddress, rightCol, doc.y - 12);
    doc.moveDown(0.5);
    doc.text(`Distance:`, leftCol).text(`${invoiceData.distanceKm} km`, rightCol, doc.y - 12);
    doc.moveDown(1.5);

    // ─── Fare Breakdown ────────────────────────
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#e2e8f0')
      .stroke();
    doc.moveDown(1);

    doc.fontSize(14).fillColor('#1e293b').text('Fare Breakdown').moveDown(0.5);
    doc.fontSize(10).fillColor('#333');

    doc.text(`Base Fare:`, leftCol).text(
      `${Number(invoiceData.baseFare).toLocaleString('vi-VN')} VND`,
      rightCol, doc.y - 12
    );
    doc.moveDown(0.5);

    const distanceFare = Number(invoiceData.totalFare) - Number(invoiceData.baseFare);
    doc.text(`Distance Fare:`, leftCol).text(
      `${distanceFare.toLocaleString('vi-VN')} VND`,
      rightCol, doc.y - 12
    );
    doc.moveDown(1);

    // ─── Total ─────────────────────────────────
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#3b82f6')
      .lineWidth(2)
      .stroke();
    doc.moveDown(0.5);

    doc.fontSize(16).fillColor('#3b82f6').text(
      `TOTAL: ${Number(invoiceData.totalFare).toLocaleString('vi-VN')} VND`,
      { align: 'right' }
    );

    doc.moveDown(3);

    // ─── Footer ────────────────────────────────
    doc
      .fontSize(9)
      .fillColor('#94a3b8')
      .text('Thank you for using SmartFleet!', { align: 'center' })
      .text('This is a computer-generated invoice.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};
