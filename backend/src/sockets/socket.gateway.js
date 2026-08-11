import { getIO } from '../config/socket.js';


export const emitCustomerOrderStatus = (customerId, { orderId, status, label, driver, totalFare }) => {
  try {
    const io = getIO();
    if (io) {
      const payload = {
        orderId,
        status,
        label,
        driver,
        totalFare,
        timestamp: new Date().toISOString(),
      };
      const customerNs = io.of('/customer');
      customerNs.to(`customer:${customerId}`).emit('order:status-update', payload);
      customerNs.to(`user:${customerId}`).emit('order:status-update', payload);
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitAdminNewOrderRequest = (orderData) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/admin').to('admin:notifications').emit('admin:new-order-request', {
        orderId: orderData.id,
        customerName: orderData.customer?.fullName || 'Khách Hàng SmartFleet',
        pickupAddress: orderData.pickupAddress,
        dropoffAddress: orderData.dropoffAddress,
        totalFare: orderData.totalFare,
        vehicleType: orderData.vehicleType || 'motorcycle',
        createdAt: orderData.createdAt,
      });
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitDriverNewOrder = (driverIds, dispatchData) => {
  try {
    const io = getIO();
    if (io) {
      const driverNamespace = io.of('/driver');
      // Broadcast to general online room
      driverNamespace.to('drivers:online').emit('driver:new-order', dispatchData);

      // Broadcast to vehicle type online room
      if (dispatchData.vehicleType) {
        driverNamespace.to(`drivers:online:${dispatchData.vehicleType}`).emit('driver:new-order', dispatchData);
      }

      // Targeted emit to specific driver & user rooms
      if (Array.isArray(driverIds) && driverIds.length > 0) {
        driverIds.forEach((id) => {
          driverNamespace.to(`driver:${id}`).emit('driver:new-order', dispatchData);
          driverNamespace.to(`user:${id}`).emit('driver:new-order', dispatchData);
        });
      }
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitDriverOrderTaken = (orderId, winningDriverId) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/driver').to('drivers:online').emit('driver:order-taken', {
        orderId,
        winningDriverId,
      });
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitAdminDriverAccepted = (orderId, driverInfo) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/admin').to('admin:notifications').emit('admin:driver-accepted', {
        orderId,
        driverInfo,
        timestamp: new Date().toISOString(),
      });
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitDriverOrderConfirmed = (driverId, orderData) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/driver').to(`driver:${driverId}`).emit('order-confirmed', orderData);
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitAdminNewDriverRegistered = (driverData) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/admin').to('admin:notifications').emit('admin:new-driver-registered', driverData);
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitDriverApprovalUpdated = (userId, approvalData) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/driver').to(`user:${userId}`).emit('driver:approval-updated', approvalData);
      if (approvalData.driverId) {
        io.of('/driver').to(`driver:${approvalData.driverId}`).emit('driver:approval-updated', approvalData);
      }
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export const emitAdminOrderStatusUpdate = (orderId, { status, label, driver, totalFare }) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/admin').to('admin:notifications').emit('admin:order-status-update', {
        orderId,
        status,
        label,
        driver,
        totalFare,
        timestamp: new Date().toISOString(),
      });
    }
  } catch {
    // Socket not initialized in CLI test mode
  }
};

export default {
  emitCustomerOrderStatus,
  emitAdminNewOrderRequest,
  emitDriverNewOrder,
  emitDriverOrderTaken,
  emitAdminDriverAccepted,
  emitAdminOrderStatusUpdate,
  emitDriverOrderConfirmed,
  emitAdminNewDriverRegistered,
  emitDriverApprovalUpdated,
};
