import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import DriversPage from '../pages/admin/DriversPage';
import OrdersPage from '../pages/admin/OrdersPage';
import LiveFleetPage from '../pages/admin/LiveFleetPage';
import AnalyticsPage from '../pages/admin/AnalyticsPage';
import AlertsPage from '../pages/admin/AlertsPage';
import CreateOrderPage from '../pages/customer/CreateOrderPage';
import MyOrdersPage from '../pages/customer/MyOrdersPage';
import InvoicesPage from '../pages/customer/InvoicesPage';
import DriverDashboard from '../pages/driver/DriverDashboard';
import AvailableOrders from '../pages/driver/AvailableOrders';
import OrderHistory from '../pages/driver/OrderHistory';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Admin Routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <DashboardLayout title="Operations Dashboard" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'drivers', element: <DriversPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'tracking', element: <LiveFleetPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'alerts', element: <AlertsPage /> },
    ],
  },

  // Customer Routes
  {
    path: '/customer',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <DashboardLayout title="Customer Dashboard" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <CreateOrderPage /> },
      { path: 'orders', element: <MyOrdersPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
    ],
  },

  // Driver Routes
  {
    path: '/driver',
    element: (
      <ProtectedRoute allowedRoles={['DRIVER']}>
        <DashboardLayout title="Driver Desk" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DriverDashboard /> },
      { path: 'available', element: <AvailableOrders /> },
      { path: 'history', element: <OrderHistory /> },
    ],
  },

  { path: '*', element: <Navigate to="/login" replace /> },
]);
