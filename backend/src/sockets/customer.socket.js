/**
 * Setup customer namespace socket handlers.
 * Handles: track-order (join room for real-time location updates)
 */
export const setupCustomerSocket = (customerNamespace) => {
  customerNamespace.on('connection', (socket) => {
    const { id: userId, role } = socket.user;

    if (role !== 'CUSTOMER') {
      socket.disconnect(true);
      return;
    }

    // Join user-specific & customer-specific room
    socket.join(`user:${userId}`);
    socket.join(`customer:${userId}`);
    console.log(`👤 Customer connected: ${userId} (joined rooms user:${userId}, customer:${userId})`);

    // ─── Track Order ───────────────────────────
    socket.on('track-order', ({ orderId }) => {
      socket.join(`order:${orderId}`);
      console.log(`👁️  Customer ${userId} tracking order ${orderId}`);
    });

    // ─── Stop Tracking ─────────────────────────
    socket.on('stop-tracking', ({ orderId }) => {
      socket.leave(`order:${orderId}`);
    });

    // ─── Disconnect ────────────────────────────
    socket.on('disconnect', () => {
      console.log(`👤 Customer disconnected: ${userId}`);
    });
  });
};
