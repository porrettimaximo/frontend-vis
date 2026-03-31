import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getCurrentRole, getDefaultAdminRoute } from '../authz';
import '../styles/console-page.css';
import './RequireRole.css';

type RequireRoleProps = {
  allowedRoles: ('SYSTEM_ADMIN' | 'ADMIN' | 'RECEPCIONISTA' | 'ENTRENADOR')[];
  title: string;
  description: string;
  children: ReactNode;
};

export default function RequireRole({
  allowedRoles,
  title,
  description,
  children
}: RequireRoleProps) {
  const role = getCurrentRole();
  if (role === 'STAFF') {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="console-page">
        <section className="console-card require-role-card">
          <div className="require-role-icon">
            <span className="material-icons-round">lock</span>
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="require-role-meta">
            Rol actual: <strong>{role}</strong>
          </div>
          <Link className="console-primary require-role-link" to={getDefaultAdminRoute(role)}>
            Volver al dashboard
          </Link>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
