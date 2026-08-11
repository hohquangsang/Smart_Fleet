import { getIO } from '../config/socket.js';
import { socketAuthMiddleware } from './auth.socket.js';
import { setupDriverSocket } from './driver.socket.js';
import { setupCustomerSocket } from './customer.socket.js';

/**
 * Initialize all Socket.IO namespaces and their handlers.
 */
export const initSocketHandlers = () => {
  const io = getIO();

  // ─── Driver Namespace (/driver) ────────────
  const driverNamespace = io.of('/driver');
  driverNamespace.use(socketAuthMiddleware);
  setupDriverSocket(driverNamespace);
  console.log('🔌 Socket namespace /driver initialized');

  // ─── Customer Namespace (/customer) ────────
  const customerNamespace = io.of('/customer');
  customerNamespace.use(socketAuthMiddleware);
  setupCustomerSocket(customerNamespace);
  console.log('🔌 Socket namespace /customer initialized');

  // ─── Admin Namespace (/admin) ──────────────
  const adminNamespace = io.of('/admin');
  adminNamespace.use(socketAuthMiddleware);
  adminNamespace.on('connection', (socket) => {
    if (socket.user.role !== 'ADMIN') {
      socket.disconnect(true);
      return;
    }

    // Join shared admin room so gateway can broadcast to all admins
    socket.join('admin:notifications');
    console.log(`🛡️  Admin connected: ${socket.user.id} → joined admin:notifications`);

    socket.on('disconnect', () => {
      console.log(`🛡️  Admin disconnected: ${socket.user.id}`);
    });
  });
  console.log('🔌 Socket namespace /admin initialized');
};
