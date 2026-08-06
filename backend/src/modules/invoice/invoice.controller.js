import * as invoiceService from './invoice.service.js';
import catchAsync from '../../utils/catch-async.js';
import path from 'path';
import fs from 'fs';
import { NotFoundError } from '../../utils/api-error.js';

export const getInvoices = catchAsync(async (req, res) => {
  const invoices = await invoiceService.getCustomerInvoices(req.user.id);

  res.status(200).json({
    success: true,
    data: { invoices },
  });
});

export const getInvoiceByOrderId = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getInvoiceByOrderId(req.params.orderId);

  res.status(200).json({
    success: true,
    data: { invoice },
  });
});

export const downloadInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getInvoiceByOrderId(req.params.orderId);

  if (!invoice.pdfUrl) {
    throw new NotFoundError('PDF not generated yet');
  }

  const filePath = path.resolve(invoice.pdfUrl);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('PDF file not found on server');
  }

  res.download(filePath, `${invoice.invoiceNumber}.pdf`);
});
