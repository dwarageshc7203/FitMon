import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function ProtectedRoute({ roles }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized || isLoading) {
    return (
      <div className="page center-content">
        <div className="card loading-card">
          <p className="card-title">Preparing your FitMon workspace...</p>
          <p className="text-muted">Authenticating with Firebase and loading your role.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    const isCoach = user.role === 'coach' || user.role === 'mentor';
    return <Navigate to={isCoach ? '/coach' : '/dashboard'} replace />;
  }

  return <Outlet />;
}
