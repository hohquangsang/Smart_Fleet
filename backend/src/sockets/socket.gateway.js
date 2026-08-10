import { getIO } from '../config/socket.js';


export const emitCustomerOrderStatus = (customerId, { orderId, status, label, driver, totalFare }) => {
  try {
    const io = getIO();
    if (io) {
      io.of('/customer').to(`customer:${customerId}`).emit('order:status-update', {
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
      if (Array.isArray(driverIds) && driverIds.length > 0) {
        driverIds.forEach((driverId) => {
          driverNamespace.to(`driver:${driverId}`).emit('driver:new-order', dispatchData);
        });
      } else {
        driverNamespace.to('drivers:online').emit('driver:new-order', dispatchData);
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

export default {
  emitCustomerOrderStatus,
  emitAdminNewOrderRequest,
  emitDriverNewOrder,
  emitDriverOrderTaken,
  emitAdminDriverAccepted,
};
