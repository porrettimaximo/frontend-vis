import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { getDefaultAdminRoute } from '../authz';
import { listTenants, login } from '../services/auth';
import type { TenantOption } from '../services/auth';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listTenants()
      .then((data) => {
        setTenants(data);
        if (data.length === 1) {
          setTenantId(String(data[0].id));
        }
      })
      .catch(() => {
        setTenants([]);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await login(email, password, tenantId ? Number(tenantId) : undefined);
      if (response.success) {
        const role =
          response.role === 'SYSTEM_ADMIN' ||
          response.role === 'ADMIN' ||
          response.role === 'RECEPCIONISTA' ||
          response.role === 'ENTRENADOR'
            ? response.role
            : 'STAFF';
        navigate(getDefaultAdminRoute(role));
      } else {
        setError(
          response.message === 'TENANT_REQUIRED'
            ? 'Seleccione un tenant para continuar.'
            : response.message || 'Credenciales invalidas.'
        );
      }
    } catch {
      setError('No se pudo iniciar sesion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-placeholder" aria-label="Logotipo VIS">
          <img src="/logovis.png" alt="VIS" className="auth-logo" />
        </div>
        <h2 className="login-title">INICIAR SESION</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {tenants.length > 1 && (
            <div className="form-group">
              <label className="form-label" htmlFor="tenant">
                TENANT
              </label>
              <select
                id="tenant"
                className="form-input"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">Seleccione un tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              CONTRASENA
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="login-actions">
            <button className="login-button" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            {error && <div className="login-error">{error}</div>}
          </div>
        </form>
        <div className="login-links">
          <Link to="/register">Registrar nuevo usuario</Link>
        </div>
      </div>
    </div>
  );
}
