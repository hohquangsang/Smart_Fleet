import prisma from '../../config/database.js';
import { NotFoundError } from '../../utils/api-error.js';

/**
 * Get invoices for a customer.
 */
export const getCustomerInvoices = async (customerId) => {
  const invoices = await prisma.invoice.findMany({
    where: {
      order: { customerId },
    },
    orderBy: { issuedAt: 'desc' },
    include: {
      order: {
        select: { id: true, status: true, createdAt: true },
      },
    },
  });

  return invoices;
};

/**
 * Get invoice by order ID.
 */
export const getInvoiceByOrderId = async (orderId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    include: {
      order: {
        select: { id: true, status: true, createdAt: true },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundError('Invoice not found for this order');
  }

  return invoice;
};
