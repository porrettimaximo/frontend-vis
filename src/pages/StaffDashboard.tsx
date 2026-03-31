import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentRole } from '../authz';
import { listRecentAccesses, type AccessLogDto } from '../services/access';
import { listMemberships, type MembershipDto } from '../services/plans';
import './StaffDashboard.css';

type StaffDashboardState = {
  accesses: AccessLogDto[];
  memberships: MembershipDto[];
  grantedToday: number;
  deniedToday: number;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return parsed.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function isGranted(result: AccessLogDto['result']) {
  return result === true || result === 'GRANTED';
}

export default function StaffDashboard() {
  const role = getCurrentRole();
  const isReception = role === 'RECEPCIONISTA';
  const isTrainer = role === 'ENTRENADOR';
  const [state, setState] = useState<StaffDashboardState>({
    accesses: [],
    memberships: [],
    grantedToday: 0,
    deniedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const today = toIsoDate(new Date());
        const [accessesResult, membershipsResult, todayAccessesResult, todayDeniedResult] = await Promise.allSettled([
          listRecentAccesses({ limit: 8 }),
          listMemberships(),
          listRecentAccesses({ from: today, to: today, result: 'allowed', limit: 100 }),
          listRecentAccesses({ from: today, to: today, result: 'denied', limit: 100 })
        ]);

        const accesses = accessesResult.status === 'fulfilled' ? accessesResult.value : [];
        const memberships = membershipsResult.status === 'fulfilled' ? membershipsResult.value : [];
        const grantedToday = todayAccessesResult.status === 'fulfilled' ? todayAccessesResult.value.length : 0;
        const deniedToday = todayDeniedResult.status === 'fulfilled' ? todayDeniedResult.value.length : 0;

        if (!active) return;
        setState({
          accesses,
          memberships,
          grantedToday,
          deniedToday
        });

        if (
          accessesResult.status === 'rejected' ||
          membershipsResult.status === 'rejected' ||
          todayAccessesResult.status === 'rejected' ||
          todayDeniedResult.status === 'rejected'
        ) {
          setError('No se pudieron cargar algunos datos del panel staff.');
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el panel staff.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const alerts = useMemo(() => {
    const today = toIsoDate(new Date());
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const expiringSoon = state.memberships.filter((membership) => {
      if (!['ACTIVE', 'DEBT'].includes(membership.membershipStatus)) return false;
      const endDate = new Date(membership.endDate);
      return !Number.isNaN(endDate.getTime()) && endDate <= nextWeek && membership.endDate >= today;
    }).length;

    const debts = state.memberships.filter((membership) => membership.membershipStatus === 'DEBT').length;
    const noCredits = state.memberships.filter(
      (membership) =>
        membership.membershipStatus === 'ACTIVE' &&
        membership.creditLimit !== null &&
        (membership.creditsRemaining ?? 0) <= 0
    ).length;

    return [
      { title: 'Vencimientos proximos', value: expiringSoon, tone: expiringSoon > 0 ? 'warning' : 'neutral' },
      { title: 'Socios con deuda', value: debts, tone: debts > 0 ? 'danger' : 'neutral' },
      { title: 'Sin creditos', value: noCredits, tone: noCredits > 0 ? 'danger' : 'neutral' }
    ];
  }, [state.memberships]);

  const headerTitle = isReception ? 'Panel de Recepcion' : 'Panel de Entrenamiento';
  const headerDescription = isReception
    ? 'Dashboard rapido para admision, accesos, cobros y atencion del mostrador.'
    : 'Dashboard rapido para seguimiento operativo, accesos y tareas de entrenamiento.';
  const primaryAction = isReception
    ? { to: '/admin/access-control', icon: 'verified_user', label: 'Validar Acceso' }
    : { to: '/admin/workouts', icon: 'fitness_center', label: 'Ver Rutinas' };
  const secondaryAction = isReception
    ? { to: '/admin/members/new', icon: 'person_add', label: 'Nuevo Socio' }
    : { to: '/admin/members', icon: 'group', label: 'Ver Socios' };
  const notesMessage = isReception
    ? 'Prioriza cobros, renovaciones y membresias sin creditos.'
    : 'Prioriza seguimiento de accesos, vencimientos y socios sin creditos.';
  const trainerAlerts = [alerts[0], alerts[2]].filter(Boolean);

  return (
    <div className="staff-dashboard">
      <div className="staff-header">
        <div>
          <h1>{headerTitle}</h1>
          <p>{headerDescription}</p>
        </div>
        <div className="staff-actions">
          <Link className="staff-primary" to={primaryAction.to}>
            <span className="material-icons-round">{primaryAction.icon}</span>
            {primaryAction.label}
          </Link>
          <Link className="staff-ghost" to={secondaryAction.to}>
            <span className="material-icons-round">{secondaryAction.icon}</span>
            {secondaryAction.label}
          </Link>
        </div>
      </div>

      {error && <div className="staff-feedback staff-feedback--error">{error}</div>}

      <div className="staff-kpis">
        <div className="staff-card">
          <h3>Accesos hoy</h3>
          <div className="staff-value">{loading ? '...' : state.grantedToday}</div>
          <div className="staff-foot muted">{loading ? 'Cargando actividad' : 'Accesos permitidos registrados hoy'}</div>
        </div>
        <div className="staff-card">
          <h3>Denegados hoy</h3>
          <div className="staff-value">{loading ? '...' : state.deniedToday}</div>
          <div className={`staff-foot ${state.deniedToday > 0 ? 'warning' : 'muted'}`}>
            {loading ? 'Cargando rechazos' : state.deniedToday > 0 ? 'Requiere revision' : 'Sin rechazos recientes'}
          </div>
        </div>
        <div className="staff-card">
          <h3>Socios presentes</h3>
          <div className="staff-value">{loading ? '...' : state.grantedToday}</div>
          <div className="staff-foot muted">
            {loading ? 'Cargando presencia' : 'Referencia basada en accesos validados hoy'}
          </div>
        </div>
        {isReception ? (
          <div className="staff-card">
            <h3>Pagos pendientes</h3>
            <div className="staff-value">{loading ? '...' : alerts[1]?.value ?? 0}</div>
            <div className={`staff-foot ${(alerts[1]?.value ?? 0) > 0 ? 'warning' : 'muted'}`}>
              {loading ? 'Cargando deudas' : (alerts[1]?.value ?? 0) > 0 ? 'Prioridad operativa' : 'Sin cobros urgentes'}
            </div>
          </div>
        ) : (
          <div className="staff-card">
            <h3>Vencen pronto</h3>
            <div className="staff-value">{loading ? '...' : alerts[0]?.value ?? 0}</div>
            <div className={`staff-foot ${(alerts[0]?.value ?? 0) > 0 ? 'warning' : 'muted'}`}>
              {loading ? 'Cargando vencimientos' : (alerts[0]?.value ?? 0) > 0 ? 'Seguimiento recomendado' : 'Sin vencimientos urgentes'}
            </div>
          </div>
        )}
      </div>

      <div className="staff-grid">
        <section className="staff-panel">
          <h3>{isReception ? 'Ultimos accesos' : 'Actividad reciente'}</h3>
          {state.accesses.length === 0 && !loading ? (
            <div className="staff-empty">Todavia no hay accesos recientes para mostrar.</div>
          ) : (
            <div className="staff-feed">
              {state.accesses.map((item) => {
                const granted = isGranted(item.result);
                const memberName = item.memberName || item.fullName || 'Socio sin nombre';
                return (
                  <div className="staff-feed-row" key={item.id}>
                    <div className="staff-feed-user">
                      <div className="staff-feed-avatar">{memberName.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="staff-feed-name">{memberName}</div>
                        <div className="staff-feed-time">{toTime(item.accessedAt)}</div>
                      </div>
                    </div>
                    <span className={`staff-status ${granted ? 'ok' : 'bad'}`}>
                      {granted ? 'Permitido' : 'Denegado'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="staff-panel">
          <h3>{isReception ? 'Alertas operativas' : 'Alertas de seguimiento'}</h3>
          <div className="staff-alerts">
            {(isTrainer ? trainerAlerts : alerts).map((alert) => (
              <div key={alert.title} className={`alert-card ${alert.tone}`}>
                <div className="alert-title">{alert.title}</div>
                <div className="alert-value">{alert.value}</div>
              </div>
            ))}
          </div>
          <div className="staff-note">
            <span className="material-icons-round">info</span>
            {loading ? 'Actualizando alertas operativas.' : notesMessage}
          </div>
        </section>
      </div>
    </div>
  );
}
