import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="dashboard"><div className="spinner spinner--lg" style={{ margin: '3rem auto' }} /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'ADMIN': return <Navigate to="/admin" replace />;
      case 'DRIVER': return <Navigate to="/driver" replace />;
      case 'CUSTOMER': return <Navigate to="/customer" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return children;
};
