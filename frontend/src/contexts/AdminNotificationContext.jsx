import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';
import api from '../services/api';
import useToast from '../hooks/useToast';

export const AdminNotificationContext = createContext({
  badgeCounts: { ordersCount: 0, driversCount: 0, usersCount: 0 },
  refreshBadges: () => {},
  clearOrdersBadge: () => {},
  clearDriversBadge: () => {},
  clearUsersBadge: () => {},
});

export const AdminNotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const toast = useToast();

  const [badgeCounts, setBadgeCounts] = useState({
    ordersCount: 0,
    driversCount: 0,
    usersCount: 0,
  });

  const fetchBadgeCounts = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'ADMIN') return;
    try {
      const { data } = await api.get('/admin/badge-counts');
      if (data?.data) {
        setBadgeCounts({
          ordersCount: data.data.ordersCount || 0,
          driversCount: data.data.driversCount || 0,
          usersCount: data.data.usersCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch admin badge counts:', err);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchBadgeCounts();
  }, [fetchBadgeCounts]);

  // Real-time socket event handlers for Admin
  useEffect(() => {
    if (!socket || !isAuthenticated || user?.role !== 'ADMIN') return;

    const handleNewOrderRequest = (orderData) => {
      setBadgeCounts((prev) => ({
        ...prev,
        ordersCount: prev.ordersCount + 1,
      }));
      toast.info(`Có đơn hàng mới #${orderData.orderId?.slice(-6)?.toUpperCase()} vừa tạo!`, 'Đơn hàng mới 📦');
    };

    const handleNewDriverRegistered = (driverData) => {
      setBadgeCounts((prev) => ({
        ...prev,
        driversCount: prev.driversCount + 1,
      }));
      toast.info(`Tài xế mới ${driverData.fullName || ''} (${driverData.licensePlate || ''}) vừa nộp hồ sơ!`, 'Tài xế mới 🚖');
    };

    const handleUserAppealed = (appealData) => {
      setBadgeCounts((prev) => ({
        ...prev,
        usersCount: prev.usersCount + 1,
      }));
      toast.warning(`Người dùng ${appealData.userName || ''} vừa gửi khiếu nại!`, 'Khiếu nại mới ⚠️');
    };

    const handleOrderStatusUpdate = () => {
      fetchBadgeCounts();
    };

    socket.on('admin:new-order-request', handleNewOrderRequest);
    socket.on('admin:new-driver-registered', handleNewDriverRegistered);
    socket.on('admin:user-appealed', handleUserAppealed);
    socket.on('admin:order-status-update', handleOrderStatusUpdate);

    return () => {
      socket.off('admin:new-order-request', handleNewOrderRequest);
      socket.off('admin:new-driver-registered', handleNewDriverRegistered);
      socket.off('admin:user-appealed', handleUserAppealed);
      socket.off('admin:order-status-update', handleOrderStatusUpdate);
    };
  }, [socket, isAuthenticated, user, toast, fetchBadgeCounts]);

  const clearOrdersBadge = useCallback(() => {
    setBadgeCounts((prev) => ({ ...prev, ordersCount: 0 }));
  }, []);

  const clearDriversBadge = useCallback(() => {
    setBadgeCounts((prev) => ({ ...prev, driversCount: 0 }));
  }, []);

  const clearUsersBadge = useCallback(() => {
    setBadgeCounts((prev) => ({ ...prev, usersCount: 0 }));
  }, []);

  return (
    <AdminNotificationContext.Provider
      value={{
        badgeCounts,
        refreshBadges: fetchBadgeCounts,
        clearOrdersBadge,
        clearDriversBadge,
        clearUsersBadge,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
};
