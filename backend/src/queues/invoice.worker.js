import { Queue } from 'bullmq';
import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import prisma from '../config/database.js';
import { generateInvoicePDF } from '../services/pdf.service.js';
import { sendInvoiceEmail } from '../services/email.service.js';
import { QUEUE_NAMES } from '../utils/constants.js';
import { v4 as uuidv4 } from 'uuid';

// Queue
export const invoiceQueue = new Queue(QUEUE_NAMES.INVOICE_GENERATE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

// Worker
const invoiceWorker = new Worker(
  QUEUE_NAMES.INVOICE_GENERATE,
  async (job) => {
    const { orderId } = job.data;
    console.log(`📄 Generating invoice for order: ${orderId}`);

    // 1. Fetch order + customer info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { fullName: true, email: true } },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 2. Generate invoice number
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const shortId = uuidv4().split('-')[0].toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${shortId}`;

    // 3. Prepare invoice data
    const invoiceData = {
      invoiceNumber,
      customerName: order.customer.fullName,
      customerEmail: order.customer.email,
      pickupAddress: order.pickupAddress,
      dropoffAddress: order.dropoffAddress,
      distanceKm: Number(order.distanceKm),
      baseFare: Number(order.totalFare) * 0.3, // ~30% is base fare
      totalFare: Number(order.totalFare),
      issuedAt: new Date(),
    };

    // 4. Generate PDF
    const pdfPath = await generateInvoicePDF(invoiceData);

    // 5. Save invoice to DB
    await prisma.invoice.create({
      data: {
        orderId,
        invoiceNumber,
        customerName: invoiceData.customerName,
        customerEmail: invoiceData.customerEmail,
        pickupAddress: invoiceData.pickupAddress,
        dropoffAddress: invoiceData.dropoffAddress,
        distanceKm: invoiceData.distanceKm,
        baseFare: invoiceData.baseFare,
        totalFare: invoiceData.totalFare,
        pdfUrl: pdfPath,
      },
    });

    // 6. Send email (non-blocking, don't fail job if email fails)
    try {
      await sendInvoiceEmail(
        invoiceData.customerEmail,
        invoiceData.customerName,
        invoiceNumber,
        pdfPath
      );
    } catch (emailError) {
      console.warn(`⚠️  Invoice email failed for ${orderId}:`, emailError.message);
    }

    console.log(`✅ Invoice ${invoiceNumber} generated for order ${orderId}`);
  },
  {
    connection: createRedisConnection(),
    concurrency: 3,
  }
);

invoiceWorker.on('failed', (job, err) => {
  console.error(`❌ Invoice generation failed for job ${job?.id}:`, err.message);
});

export default invoiceWorker;
