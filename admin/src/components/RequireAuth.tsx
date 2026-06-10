import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../store/auth';

/** Korumalı rotalar için auth guard: oturum yoksa /login'e yönlendirir. */
export function RequireAuth() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
