import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/i18n';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { AdminNotificationProvider } from './contexts/AdminNotificationContext';
import { MaintenanceProvider } from './contexts/MaintenanceContext';
import MaintenanceBanner from './components/common/MaintenanceBanner';
import { router } from './router';
import './styles/global.css';
import './styles/components.css';
import './styles/sidebar.css';
import './styles/dashboard.css';
import './styles/auth.css';
import './styles/customer.css';
import './styles/driver.css';
import './styles/admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <MaintenanceProvider>
            <AdminNotificationProvider>
              <RouterProvider router={router} />
              <MaintenanceBanner />
            </AdminNotificationProvider>
          </MaintenanceProvider>
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);

