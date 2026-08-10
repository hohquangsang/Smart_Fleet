import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthPage from '../pages/auth/AuthPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import DriversPage from '../pages/admin/DriversPage';
import UsersPage from '../pages/admin/UsersPage';
import CreateOrderPage from '../pages/customer/CreateOrderPage';
import CustomerTrackingPage from '../pages/customer/CustomerTrackingPage';
import CustomerHistoryPage from '../pages/customer/CustomerHistoryPage';
import DriverDashboard from '../pages/driver/DriverDashboard';
import DriverDispatchPage from '../pages/driver/DriverDispatchPage';
import ActiveTripPage from '../pages/driver/ActiveTripPage';
import EarningsProfilePage from '../pages/driver/EarningsProfilePage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <AuthPage /> },
  { path: '/register', element: <AuthPage /> },

  // Admin Routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <DashboardLayout title="SmartFleet Admin Console" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'drivers', element: <DriversPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },

  // Customer Routes
  {
    path: '/customer',
    element: (
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <DashboardLayout title="Khách Hàng" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <CreateOrderPage /> },
      { path: 'tracking', element: <CustomerTrackingPage /> },
      { path: 'history', element: <CustomerHistoryPage /> },
      { path: 'orders', element: <Navigate to="/customer/history" replace /> },
      { path: 'invoices', element: <Navigate to="/customer/history" replace /> },
    ],
  },

  // Driver Routes
  {
    path: '/driver',
    element: (
      <ProtectedRoute allowedRoles={['DRIVER']}>
        <DashboardLayout title="SmartFleet Bàn Làm Việc Tài Xế" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DriverDashboard /> },
      { path: 'dispatch', element: <DriverDispatchPage /> },
      { path: 'active', element: <ActiveTripPage /> },
      { path: 'earnings', element: <EarningsProfilePage /> },
      { path: 'available', element: <Navigate to="/driver/dispatch" replace /> },
      { path: 'history', element: <Navigate to="/driver/earnings" replace /> },
    ],
  },

  { path: '*', element: <Navigate to="/login" replace /> },
]);
