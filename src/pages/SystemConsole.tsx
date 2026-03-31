import { useEffect, useMemo, useState } from 'react';
import {
  activateSystemStaffUser,
  activateSystemTenant,
  createSystemTenant,
  createSystemTenantStaffUser,
  deactivateSystemStaffUser,
  deactivateSystemTenant,
  getSystemTenant,
  listSystemTenants,
  unlockSystemStaffUser,
  updateSystemStaffUserRole
} from '../services/system-admin';
import type { SystemTenantDetailDto, SystemTenantSummaryDto } from '../services/system-admin';
import type { StaffRole, StaffUserDto } from '../services/staff-users';
import './SystemConsole.css';

const ROLE_OPTIONS: StaffRole[] = ['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR'];

export default function SystemConsole() {
  const [tenants, setTenants] = useState<SystemTenantSummaryDto[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SystemTenantDetailDto | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    tenantName: '',
    adminUsername: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'RECEPCIONISTA' as StaffRole
  });

  useEffect(() => {
    void loadTenants();
  }, []);

  const metrics = useMemo(() => {
    const activeTenants = tenants.filter((tenant) => tenant.active).length;
    const openRegisters = tenants.filter((tenant) => tenant.openCashRegister).length;
    const revenue = tenants.reduce((acc, tenant) => acc + (tenant.totalRevenue ?? 0), 0);
    const members = tenants.reduce((acc, tenant) => acc + tenant.members, 0);
    return { activeTenants, openRegisters, revenue, members };
  }, [tenants]);

  async function loadTenants(preferredTenantId?: number) {
    setLoadingTenants(true);
    setError('');
    try {
      const data = await listSystemTenants();
      setTenants(data);
      const nextTenantId = preferredTenantId ?? selectedTenantId ?? (data.length > 0 ? data[0].id : null);
      setSelectedTenantId(nextTenantId);
      if (nextTenantId !== null) {
        await loadTenantDetail(nextTenantId);
      } else {
        setDetail(null);
      }
    } catch (err) {
      setError(mapSystemError(err));
    } finally {
      setLoadingTenants(false);
    }
  }

  async function loadTenantDetail(tenantId: number) {
    setLoadingDetail(true);
    setError('');
    try {
      const data = await getSystemTenant(tenantId);
      setDetail(data);
      setSelectedTenantId(tenantId);
    } catch (err) {
      setError(mapSystemError(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleCreateTenant(event: React.FormEvent) {
    event.preventDefault();
    if (!tenantForm.tenantName.trim() || !tenantForm.adminUsername.trim() || !tenantForm.adminEmail.trim() || !tenantForm.adminPassword) {
      setError('Completa tenant, usuario admin, email y contrasena.');
      return;
    }

    setCreatingTenant(true);
    setError('');
    try {
      const created = await createSystemTenant({
        tenantName: tenantForm.tenantName.trim(),
        adminUsername: tenantForm.adminUsername.trim(),
        adminEmail: tenantForm.adminEmail.trim(),
        adminPassword: tenantForm.adminPassword
      });
      setTenantForm({ tenantName: '', adminUsername: '', adminEmail: '', adminPassword: '' });
      await loadTenants(created.id);
    } catch (err) {
      setError(mapSystemError(err));
    } finally {
      setCreatingTenant(false);
    }
  }

  async function handleToggleTenant(tenant: SystemTenantSummaryDto) {
    setError('');
    try {
      const updated = tenant.active
        ? await deactivateSystemTenant(tenant.id)
        : await activateSystemTenant(tenant.id);
      patchTenantSummary(updated);
      if (selectedTenantId === tenant.id) {
        await loadTenantDetail(tenant.id);
      }
    } catch (err) {
      setError(mapSystemError(err));
    }
  }

  async function handleCreateStaff(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTenantId) {
      setError('Selecciona un tenant antes de crear usuarios.');
      return;
    }
    if (!staffForm.username.trim() || !staffForm.email.trim() || !staffForm.password) {
      setError('Completa usuario, email y contrasena del staff.');
      return;
    }

    setCreatingStaff(true);
    setError('');
    try {
      await createSystemTenantStaffUser(selectedTenantId, {
        username: staffForm.username.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        role: staffForm.role
      });
      setStaffForm({ username: '', email: '', password: '', role: 'RECEPCIONISTA' });
      await loadTenants(selectedTenantId);
    } catch (err) {
      setError(mapSystemError(err));
    } finally {
      setCreatingStaff(false);
    }
  }

  async function handleStaffRoleChange(userId: number, role: StaffRole) {
    try {
      const updated = await updateSystemStaffUserRole(userId, role);
      patchStaffUser(updated);
    } catch (err) {
      setError(mapSystemError(err));
    }
  }

  async function handleStaffToggle(user: StaffUserDto) {
    try {
      const updated = user.active
        ? await deactivateSystemStaffUser(user.id)
        : await activateSystemStaffUser(user.id);
      patchStaffUser(updated);
      if (selectedTenantId !== null) {
        await loadTenants(selectedTenantId);
      }
    } catch (err) {
      setError(mapSystemError(err));
    }
  }

  async function handleStaffUnlock(userId: number) {
    try {
      const updated = await unlockSystemStaffUser(userId);
      patchStaffUser(updated);
    } catch (err) {
      setError(mapSystemError(err));
    }
  }

  function patchTenantSummary(updated: SystemTenantSummaryDto) {
    setTenants((prev) => prev.map((tenant) => (tenant.id === updated.id ? updated : tenant)));
    setDetail((prev) => (prev && prev.summary.id === updated.id ? { ...prev, summary: updated } : prev));
  }

  function patchStaffUser(updated: StaffUserDto) {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            staffUsers: prev.staffUsers.map((user) => (user.id === updated.id ? updated : user)).sort((a, b) => a.username.localeCompare(b.username))
          }
        : prev
    );
  }

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Consola del Sistema VIS</h1>
          <p>Vista global para controlar tenants, salud operativa, staff interno y altas administrativas.</p>
        </div>
        <div className="console-actions">
          <button className="console-secondary" type="button" onClick={() => void loadTenants()}>
            <span className="material-icons-round">refresh</span>
            Actualizar
          </button>
        </div>
      </div>

      {error && <div className="system-feedback system-feedback--error">{error}</div>}

      <div className="console-kpis">
        <section className="console-card">
          <div className="console-kpi-value">{tenants.length}</div>
          <div className="console-kpi-label">Tenants totales</div>
          <div className="console-kpi-foot success">{metrics.activeTenants} activos</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{metrics.members}</div>
          <div className="console-kpi-label">Socios en plataforma</div>
          <div className="console-kpi-foot muted">Consolidado de todos los tenants</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{formatCurrency(metrics.revenue)}</div>
          <div className="console-kpi-label">Ingresos historicos</div>
          <div className="console-kpi-foot warning">{metrics.openRegisters} cajas abiertas</div>
        </section>
      </div>

      <div className="console-grid console-grid--wide">
        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Tenants</h2>
              <p>Panorama completo de clientes, estado operativo y volumen de datos.</p>
            </div>
          </div>

          <div className="system-tenant-list">
            {loadingTenants ? (
              <div className="system-empty">Cargando tenants...</div>
            ) : tenants.length === 0 ? (
              <div className="system-empty">No hay tenants cargados todavia.</div>
            ) : (
              tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  className={`system-tenant-card ${selectedTenantId === tenant.id ? 'is-active' : ''}`}
                  onClick={() => void loadTenantDetail(tenant.id)}
                >
                  <div className="system-tenant-head">
                    <div>
                      <strong>{tenant.name}</strong>
                      <small>Tenant #{tenant.id}</small>
                    </div>
                    <span className={`console-badge ${tenant.active ? 'success' : 'danger'}`}>
                      {tenant.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="system-tenant-metrics">
                    <span>{tenant.members} socios</span>
                    <span>{tenant.staffUsers} staff</span>
                    <span>{tenant.membershipsWithDebt} con deuda</span>
                  </div>
                  <div className="system-tenant-foot">
                    <span>{tenant.openCashRegister ? 'Caja abierta' : 'Caja sin apertura'}</span>
                    <span>{formatCurrency(tenant.totalRevenue)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Alta de tenant</h2>
              <p>Crea un tenant nuevo con su administrador inicial en una sola operacion.</p>
            </div>
          </div>
          <form className="console-form-grid" onSubmit={handleCreateTenant}>
            <div className="console-field console-field--full">
              <label htmlFor="system-tenant-name">Nombre del tenant</label>
              <input id="system-tenant-name" value={tenantForm.tenantName} onChange={(event) => setTenantForm((prev) => ({ ...prev, tenantName: event.target.value }))} />
            </div>
            <div className="console-field">
              <label htmlFor="system-admin-user">Usuario admin</label>
              <input id="system-admin-user" value={tenantForm.adminUsername} onChange={(event) => setTenantForm((prev) => ({ ...prev, adminUsername: event.target.value }))} />
            </div>
            <div className="console-field">
              <label htmlFor="system-admin-email">Email admin</label>
              <input id="system-admin-email" type="email" value={tenantForm.adminEmail} onChange={(event) => setTenantForm((prev) => ({ ...prev, adminEmail: event.target.value }))} />
            </div>
            <div className="console-field console-field--full">
              <label htmlFor="system-admin-password">Contrasena inicial</label>
              <input id="system-admin-password" type="password" value={tenantForm.adminPassword} onChange={(event) => setTenantForm((prev) => ({ ...prev, adminPassword: event.target.value }))} />
            </div>
            <div className="console-field console-field--full">
              <button className="console-primary" type="submit" disabled={creatingTenant}>
                <span className="material-icons-round">domain_add</span>
                {creatingTenant ? 'Creando tenant...' : 'Crear tenant'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="console-card console-stack">
        <div className="console-card-header">
          <div>
            <h2>{detail?.summary.name ?? 'Detalle del tenant'}</h2>
            <p>Controla activacion, staff y principales indicadores del tenant seleccionado.</p>
          </div>
          {detail && (
            <div className="console-actions">
              <button className="console-secondary" type="button" onClick={() => void handleToggleTenant(detail.summary)}>
                <span className="material-icons-round">{detail.summary.active ? 'pause_circle' : 'play_circle'}</span>
                {detail.summary.active ? 'Desactivar tenant' : 'Activar tenant'}
              </button>
            </div>
          )}
        </div>

        {loadingDetail ? (
          <div className="system-empty">Cargando detalle...</div>
        ) : !detail ? (
          <div className="system-empty">Selecciona un tenant para ver su administracion.</div>
        ) : (
          <>
            <div className="console-stat-grid">
              <div className="console-stat-box"><span>Socios</span><strong>{detail.summary.members}</strong></div>
              <div className="console-stat-box"><span>Socios activos</span><strong>{detail.summary.activeMembers}</strong></div>
              <div className="console-stat-box"><span>Planes activos</span><strong>{detail.summary.activePlans}</strong></div>
              <div className="console-stat-box"><span>Membresias activas</span><strong>{detail.summary.activeMemberships}</strong></div>
              <div className="console-stat-box"><span>Deuda</span><strong>{detail.summary.membershipsWithDebt}</strong></div>
              <div className="console-stat-box"><span>Ingresos</span><strong>{formatCurrency(detail.summary.totalRevenue)}</strong></div>
            </div>

            <div className="console-grid console-grid--two">
              <section className="console-card system-inner-card">
                <div className="console-card-header">
                  <div>
                    <h3>Staff del tenant</h3>
                    <p>Gestion interna completa de cuentas operativas de este cliente.</p>
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
                      {detail.staffUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="system-empty system-empty--table">Este tenant todavia no tiene staff operativo.</td>
                        </tr>
                      ) : (
                        detail.staffUsers.map((user) => (
                          <tr key={user.id}>
                            <td>
                              <div className="system-user-cell">
                                <strong>{user.username}</strong>
                                <small>{user.email}</small>
                              </div>
                            </td>
                            <td>
                              <select className="system-role-select" value={user.role} onChange={(event) => void handleStaffRoleChange(user.id, event.target.value as StaffRole)}>
                                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                              </select>
                            </td>
                            <td><span className={`console-badge ${user.active ? 'success' : 'danger'}`}>{user.active ? 'Activo' : 'Inactivo'}</span></td>
                            <td>{user.lockedUntil ? <span className="console-badge warning">Bloqueado</span> : <span className="console-badge success">Libre</span>}</td>
                            <td>
                              <div className="system-row-actions">
                                <button type="button" onClick={() => void handleStaffToggle(user)}>{user.active ? 'Desactivar' : 'Activar'}</button>
                                <button type="button" onClick={() => void handleStaffUnlock(user.id)}>Desbloquear</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="console-card system-inner-card">
                <div className="console-card-header">
                  <div>
                    <h3>Nuevo usuario interno</h3>
                    <p>Alta directa dentro del tenant seleccionado.</p>
                  </div>
                </div>
                <form className="console-form-grid" onSubmit={handleCreateStaff}>
                  <div className="console-field">
                    <label htmlFor="tenant-staff-username">Usuario</label>
                    <input id="tenant-staff-username" value={staffForm.username} onChange={(event) => setStaffForm((prev) => ({ ...prev, username: event.target.value }))} />
                  </div>
                  <div className="console-field">
                    <label htmlFor="tenant-staff-email">Email</label>
                    <input id="tenant-staff-email" type="email" value={staffForm.email} onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))} />
                  </div>
                  <div className="console-field">
                    <label htmlFor="tenant-staff-password">Contrasena</label>
                    <input id="tenant-staff-password" type="password" value={staffForm.password} onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))} />
                  </div>
                  <div className="console-field">
                    <label htmlFor="tenant-staff-role">Rol</label>
                    <select id="tenant-staff-role" value={staffForm.role} onChange={(event) => setStaffForm((prev) => ({ ...prev, role: event.target.value as StaffRole }))}>
                      {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="console-field console-field--full">
                    <button className="console-primary" type="submit" disabled={creatingStaff}>
                      <span className="material-icons-round">person_add</span>
                      {creatingStaff ? 'Creando usuario...' : 'Crear usuario'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value ?? 0);
}

function mapSystemError(error: unknown) {
  const message = error instanceof Error ? error.message : 'No se pudo completar la operacion.';
  if (message === 'TENANT_NAME_ALREADY_EXISTS') return 'Ya existe un tenant con ese nombre.';
  if (message === 'EMAIL_ALREADY_EXISTS') return 'Ya existe un usuario con ese email dentro del tenant.';
  if (message === 'USERNAME_ALREADY_EXISTS') return 'Ya existe un usuario con ese nombre dentro del tenant.';
  if (message === 'ROLE_NOT_ALLOWED') return 'El rol SYSTEM_ADMIN no se administra desde tenants.';
  if (message === 'CANNOT_DEACTIVATE_CURRENT_TENANT') return 'No podes desactivar el tenant asociado a tu sesion actual.';
  return message;
}
