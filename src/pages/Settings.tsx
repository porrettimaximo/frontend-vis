import { useMemo } from 'react';
import './Settings.css';

export default function Settings() {
  const sessionInfo = useMemo(
    () => ({
      email: sessionStorage.getItem('vis_auth_email') ?? 'Sin sesion',
      role: sessionStorage.getItem('vis_auth_role') ?? 'Sin rol',
      tenantId: sessionStorage.getItem('vis_auth_tenant_id') ?? 'Sin tenant'
    }),
    []
  );

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Configuracion</h1>
          <p>Panel de referencia del entorno actual. Todavia no existen endpoints de configuracion persistente.</p>
        </div>
        <div className="console-actions">
          <button className="console-secondary" type="button" disabled>
            <span className="material-icons-round">sync_disabled</span>
            Sin persistencia
          </button>
        </div>
      </div>

      <div className="settings-grid">
        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Control de acceso</h2>
              <p>Resumen real del comportamiento que hoy depende del backend y de los planes configurados.</p>
            </div>
          </div>
          <div className="console-list">
            <div className="console-list-item">
              <div>
                <strong>Zona horaria operativa</strong>
                <small>America/Buenos_Aires</small>
              </div>
            </div>
            <div className="console-list-item">
              <div>
                <strong>Politica de acceso</strong>
                <small>Se resuelve por plan y membresia, no desde esta pantalla.</small>
              </div>
            </div>
          </div>
        </section>

        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Sesion actual</h2>
              <p>Datos reales de la sesion autenticada en el navegador.</p>
            </div>
          </div>
          <div className="console-stat-grid">
            <div className="console-stat-box">
              <span>Email</span>
              <strong>{sessionInfo.email}</strong>
            </div>
            <div className="console-stat-box">
              <span>Rol</span>
              <strong>{sessionInfo.role}</strong>
            </div>
            <div className="console-stat-box">
              <span>Tenant</span>
              <strong>{sessionInfo.tenantId}</strong>
            </div>
          </div>
        </section>

        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Capacidades reales del sistema</h2>
              <p>Lo que hoy si esta conectado y lo que todavia falta implementar.</p>
            </div>
          </div>
          <div className="console-list">
            <div className="console-list-item">
              <div>
                <strong>Modulos activos</strong>
                <small>Socios, perfil medico, planes, pagos, caja, accesos, staff y reportes.</small>
              </div>
            </div>
            <div className="console-list-item">
              <div>
                <strong>Modulos pendientes</strong>
                <small>Configuracion persistente y rutinas con backend dedicado.</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
