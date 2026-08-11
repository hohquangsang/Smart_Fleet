import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthPage from '../pages/auth/AuthPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPage from '../pages/admin/DashboardPage';
import DriversPage from '../pages/admin/DriversPage';
import UsersPage from '../pages/admin/UsersPage';
import AdminOrdersPage from '../pages/admin/OrdersPage';
import CreateOrderPage from '../pages/customer/CreateOrderPage';
import CustomerTrackingPage from '../pages/customer/CustomerTrackingPage';
import CustomerHistoryPage from '../pages/customer/CustomerHistoryPage';
import CustomerProfilePage from '../pages/customer/CustomerProfilePage';
import DriverDashboard from '../pages/driver/DriverDashboard';
import DriverDispatchPage from '../pages/driver/DriverDispatchPage';
import ActiveTripPage from '../pages/driver/ActiveTripPage';
import EarningsProfilePage from '../pages/driver/EarningsProfilePage';
import DriverProfilePage from '../pages/driver/DriverProfilePage';
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
      { path: 'orders', element: <AdminOrdersPage /> },
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
      { path: 'profile', element: <CustomerProfilePage /> },
      { path: 'orders', element: <Navigate to="/customer/history" replace /> },
      { path: 'invoices', element: <Navigate to="/customer/history" replace /> },
    ],
  },

  // Driver Routes
  {
    path: '/driver',
    element: (
      <ProtectedRoute allowedRoles={['DRIVER']}>
        <DashboardLayout title="SmartFleet Driver" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DriverDashboard /> },
      { path: 'dispatch', element: <DriverDispatchPage /> },
      { path: 'active', element: <ActiveTripPage /> },
      { path: 'earnings', element: <EarningsProfilePage /> },
      { path: 'profile', element: <DriverProfilePage /> },
      { path: 'available', element: <Navigate to="/driver/dispatch" replace /> },
      { path: 'history', element: <Navigate to="/driver/earnings" replace /> },
    ],
  },

  { path: '*', element: <Navigate to="/login" replace /> },
]);
