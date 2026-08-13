import { useContext } from 'react';
import { AdminNotificationContext } from '../contexts/AdminNotificationContext';

const useAdminNotifications = () => {
  return useContext(AdminNotificationContext);
};

export default useAdminNotifications;
