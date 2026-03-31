import { useNavigate } from 'react-router-dom';
import { logout } from '../services/auth';
import './Topbar.css';

export default function Topbar() {
  const navigate = useNavigate();
  const userEmail = sessionStorage.getItem('vis_auth_email') ?? 'Sin sesion';
  const userRole = sessionStorage.getItem('vis_auth_role') ?? 'STAFF';
  const emailPrefix = userEmail.split('@')[0] ?? userEmail;
  const userLabel = emailPrefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const avatarLetter = userLabel.charAt(0).toUpperCase() || 'U';

  return (
    <header className="topbar">
      <div className="topbar-spacer" aria-hidden="true" />

      <div className="topbar-actions">
        <div className="user">
          <div className="topbar-avatar" aria-hidden="true">
            {avatarLetter}
          </div>
          <div className="user-meta">
            <span>{userLabel || userEmail}</span>
            <small>{userRole}</small>
          </div>
          <button
            className="logout-button"
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
