import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/auth';
import './Login.css';

export default function Register() {
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateRegisterForm({
      tenantName,
      username,
      email,
      password,
      confirmPassword
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        tenantName: tenantName.trim(),
        username: username.trim(),
        email: email.trim(),
        password
      });

      if (response.success) {
        setSuccess('Cuenta creada correctamente. Ya podes iniciar sesion.');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setError(mapRegisterError(response.message));
      }
    } catch {
      setError('No se pudo registrar el usuario.');
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
        <h2 className="login-title">REGISTRAR NUEVA CUENTA</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="tenantName">
              NOMBRE DEL GIMNASIO
            </label>
            <input
              id="tenantName"
              type="text"
              className="form-input"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              USUARIO
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
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
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              REPETIR CONTRASENA
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="login-actions">
            <button className="login-button" type="submit" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}
          </div>
        </form>
        <div className="login-links">
          <Link to="/login">Ya tengo cuenta</Link>
        </div>
      </div>
    </div>
  );
}

function mapRegisterError(message?: string) {
  if (!message) return 'No se pudo registrar la cuenta.';
  if (message === 'TENANT_NAME_ALREADY_EXISTS') return 'Ese gimnasio ya existe.';
  if (message === 'EMAIL_ALREADY_EXISTS') return 'Ese email ya existe para el tenant.';
  if (message.includes('size must be between 8 and 100')) return 'La contrasena debe tener al menos 8 caracteres.';
  if (message.includes('must not be blank')) return 'Completa todos los campos obligatorios.';
  if (message.includes('must be a well-formed email address')) return 'Ingresa un email valido.';
  return message;
}

function validateRegisterForm(values: {
  tenantName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  if (!values.tenantName.trim() || !values.username.trim() || !values.email.trim() || !values.password) {
    return 'Completa todos los campos obligatorios.';
  }
  if (values.tenantName.trim().length < 3) {
    return 'El nombre del gimnasio debe tener al menos 3 caracteres.';
  }
  if (values.username.trim().length < 3) {
    return 'El usuario debe tener al menos 3 caracteres.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'Ingresa un email valido.';
  }
  if (values.password.length < 8) {
    return 'La contrasena debe tener al menos 8 caracteres.';
  }
  if (values.password !== values.confirmPassword) {
    return 'Las contrasenas no coinciden.';
  }
  return '';
}
