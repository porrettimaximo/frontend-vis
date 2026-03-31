import { Link } from 'react-router-dom';
import './Workouts.css';

export default function Workouts() {
  const tenantId = sessionStorage.getItem('vis_auth_tenant_id') ?? 'sin tenant';

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Rutinas y Clases</h1>
          <p>Modulo reservado para planificacion de entrenamiento. Todavia no tiene backend operativo en este proyecto.</p>
        </div>
        <div className="console-actions">
          <Link className="console-secondary" to="/admin/staff-management">
            <span className="material-icons-round">groups</span>
            Ver staff
          </Link>
          <Link className="console-primary" to="/admin/reports">
            <span className="material-icons-round">insights</span>
            Ir a reportes
          </Link>
        </div>
      </div>

      <div className="console-grid console-grid--two">
        <section className="console-card workouts-card">
          <div className="workouts-icon">
            <span className="material-icons-round">fitness_center</span>
          </div>
          <h3>Modulo pendiente de integracion</h3>
          <p>No hay endpoints de rutinas, clases, cupos ni agenda en el backend actual.</p>
          <div className="console-note">
            Esta pantalla se dejo visible para completar navegacion, pero sin datos inventados ni acciones que aparenten guardar.
          </div>
        </section>

        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Estado actual</h2>
              <p>Referencia real del entorno para este tenant.</p>
            </div>
          </div>
          <div className="console-stat-grid">
            <div className="console-stat-box">
              <span>Tenant activo</span>
              <strong>{tenantId}</strong>
            </div>
            <div className="console-stat-box">
              <span>Backend</span>
              <strong>Sin modulo de rutinas</strong>
            </div>
          </div>
          <div className="console-list">
            <div className="console-list-item">
              <div>
                <strong>Siguiente paso tecnico</strong>
                <small>Definir entidades, DTOs y endpoints de clases o rutinas.</small>
              </div>
            </div>
            <div className="console-list-item">
              <div>
                <strong>Opciones disponibles hoy</strong>
                <small>Operar con socios, accesos, pagos, caja, staff y reportes.</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
