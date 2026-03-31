import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const basicToken = sessionStorage.getItem('vis_auth_basic');
  const bearerToken = sessionStorage.getItem('vis_auth_bearer');
  if (!basicToken && !bearerToken) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
