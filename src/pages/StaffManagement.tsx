import { useEffect, useMemo, useState } from 'react';
import {
  activateStaffUser,
  createStaffUser,
  deactivateStaffUser,
  listStaffUsers,
  unlockStaffUser,
  updateStaffUserRole
} from '../services/staff-users';
import type { StaffRole, StaffUserDto } from '../services/staff-users';
import './StaffManagement.css';

const ROLE_OPTIONS: StaffRole[] = ['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR'];

export default function StaffManagement() {
  const [staffUsers, setStaffUsers] = useState<StaffUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'RECEPCIONISTA' as StaffRole
  });

  async function loadStaffUsers() {
    setLoading(true);
    setError('');
    try {
      const data = await listStaffUsers();
      setStaffUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el staff.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaffUsers();
  }, []);

  const metrics = useMemo(() => {
    const activeUsers = staffUsers.filter((user) => user.active).length;
    const blockedUsers = staffUsers.filter((user) => Boolean(user.lockedUntil)).length;
    const admins = staffUsers.filter((user) => user.role === 'ADMIN').length;
    return { activeUsers, blockedUsers, admins };
  }, [staffUsers]);

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('Completa usuario, email y contrasena.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createStaffUser({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role
      });
      setStaffUsers((prev) => [...prev, created].sort((a, b) => a.username.localeCompare(b.username)));
      setForm({
        username: '',
        email: '',
        password: '',
        role: 'RECEPCIONISTA'
      });
    } catch (err) {
      setError(mapStaffError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId: number, role: StaffRole) {
    try {
      const updated = await updateStaffUserRole(userId, role);
      patchStaffUser(updated);
    } catch (err) {
      setError(mapStaffError(err));
    }
  }

  async function handleUnlock(userId: number) {
    try {
      const updated = await unlockStaffUser(userId);
      patchStaffUser(updated);
    } catch (err) {
      setError(mapStaffError(err));
    }
  }

  async function handleToggleActive(user: StaffUserDto) {
    try {
      const updated = user.active
        ? await deactivateStaffUser(user.id)
        : await activateStaffUser(user.id);
      patchStaffUser(updated);
    } catch (err) {
      setError(mapStaffError(err));
    }
  }

  function patchStaffUser(updated: StaffUserDto) {
    setStaffUsers((prev) =>
      prev
        .map((user) => (user.id === updated.id ? updated : user))
        .sort((a, b) => a.username.localeCompare(b.username))
    );
  }

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Staff y Roles</h1>
          <p>Gestion centralizada de usuarios internos, permisos operativos y cuentas bloqueadas.</p>
        </div>
        <div className="console-actions">
          <button className="console-secondary" type="button" onClick={loadStaffUsers}>
            <span className="material-icons-round">refresh</span>
            Recargar
          </button>
        </div>
      </div>

      {error && <div className="staff-feedback staff-feedback--error">{error}</div>}

      <div className="console-kpis">
        <section className="console-card">
          <div className="console-kpi-value">{metrics.activeUsers}</div>
          <div className="console-kpi-label">Usuarios activos</div>
          <div className="console-kpi-foot success">{metrics.admins} administradores</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{metrics.blockedUsers}</div>
          <div className="console-kpi-label">Cuentas bloqueadas</div>
          <div className="console-kpi-foot danger">Listas para desbloqueo</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{ROLE_OPTIONS.length}</div>
          <div className="console-kpi-label">Roles operativos</div>
          <div className="console-kpi-foot muted">Admin, recepcion y entrenamiento</div>
        </section>
      </div>

      <div className="console-grid console-grid--two">
        <section className="console-card">
          <div className="console-card-header">
            <div>
              <h2>Usuarios del staff</h2>
              <p>Alta, activacion, desbloqueo y cambio de rol por tenant.</p>
            </div>
          </div>
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Bloqueo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="staff-empty">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : staffUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="staff-empty">
                      Todavia no hay usuarios cargados para este tenant.
                    </td>
                  </tr>
                ) : (
                  staffUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="staff-user-cell">
                          <strong>{user.username}</strong>
                          <small>{user.email}</small>
                        </div>
                      </td>
                      <td>
                        <select
                          className="staff-role-select"
                          value={user.role}
                          onChange={(event) => handleRoleChange(user.id, event.target.value as StaffRole)}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`console-badge ${user.active ? 'success' : 'danger'}`}>
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        {user.lockedUntil ? (
                          <span className="console-badge warning">Bloqueado</span>
                        ) : (
                          <span className="console-badge success">Libre</span>
                        )}
                      </td>
                      <td>
                        <div className="staff-row-actions">
                          <button type="button" onClick={() => handleToggleActive(user)}>
                            {user.active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnlock(user.id)}
                            disabled={!user.lockedUntil && user.failedLoginAttempts === 0}
                          >
                            Desbloquear
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Nuevo usuario</h2>
              <p>Alta de cuentas internas dentro del tenant actual.</p>
            </div>
          </div>
          <form className="console-form-grid" onSubmit={handleCreateUser}>
            <div className="console-field">
              <label htmlFor="staff-username">Usuario</label>
              <input
                id="staff-username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              />
            </div>
            <div className="console-field">
              <label htmlFor="staff-email">Email</label>
              <input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="console-field">
              <label htmlFor="staff-password">Contrasena</label>
              <input
                id="staff-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div className="console-field">
              <label htmlFor="staff-role">Rol</label>
              <select
                id="staff-role"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as StaffRole }))}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="console-field console-field--full">
              <button className="console-primary staff-submit" type="submit" disabled={submitting}>
                <span className="material-icons-round">person_add</span>
                {submitting ? 'Creando usuario...' : 'Crear usuario'}
              </button>
            </div>
          </form>

          <div className="staff-role-card">
            <strong>ADMIN</strong>
            <small>Acceso total a socios, caja, reportes y configuracion.</small>
          </div>
          <div className="staff-role-card">
            <strong>RECEPCIONISTA</strong>
            <small>Alta de socios, validacion de acceso, cobros y caja operativa.</small>
          </div>
          <div className="staff-role-card">
            <strong>ENTRENADOR</strong>
            <small>Consulta operativa, validacion de acceso y seguimiento medico.</small>
          </div>
        </section>
      </div>
    </div>
  );
}

function mapStaffError(error: unknown) {
  const message = error instanceof Error ? error.message : 'No se pudo completar la operacion.';
  if (message === 'EMAIL_ALREADY_EXISTS') return 'Ya existe un usuario con ese email.';
  if (message === 'USERNAME_ALREADY_EXISTS') return 'Ya existe un usuario con ese nombre.';
  if (message === 'CANNOT_MANAGE_CURRENT_USER') return 'No podes desactivar tu propio usuario.';
  return message;
}
