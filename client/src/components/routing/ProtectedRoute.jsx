import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../auth/AuthContext';
import Skeleton from '../ui/Skeleton';

export function ProtectedRoute({ roles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-page">
        <div className="stack" style={{ width: 320 }}>
          <Skeleton height={40} />
          <Skeleton height={120} />
          <Skeleton height={40} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="auth-page">
        <Skeleton height={280} width={420} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
