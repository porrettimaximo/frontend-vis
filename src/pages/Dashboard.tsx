import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRecentAccesses, type AccessLogDto } from '../services/access';
import { listMembers, type MemberDto } from '../services/members';
import { listMemberships, type MembershipDto } from '../services/plans';
import { getAccessStatistics, getFinancialStatistics, type PaymentStatDto } from '../services/statistics';
import './Dashboard.css';

type DashboardState = {
  members: MemberDto[];
  memberships: MembershipDto[];
  revenue: PaymentStatDto[];
  accesses: AccessLogDto[];
  todayAccesses: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value);
}

function formatShortDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function formatAccessTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return parsed.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function reasonLabel(reason?: string | null) {
  switch (reason) {
    case 'MEMBERSHIP_EXPIRED':
      return 'Membresia vencida';
    case 'MEMBERSHIP_NOT_FOUND':
      return 'Sin membresia activa';
    case 'CREDITS_EXHAUSTED':
      return 'Sin creditos';
    case 'INACTIVE_MEMBER':
      return 'Socio inactivo';
    case 'ALREADY_USED_TODAY':
      return 'Ya ingreso hoy';
    case 'PAYMENT_REQUIRED':
      return 'Pago pendiente';
    case 'OK':
      return 'Acceso validado';
    default:
      return reason ?? 'Sin detalle';
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState<DashboardState>({
    members: [],
    memberships: [],
    revenue: [],
    accesses: [],
    todayAccesses: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const from = sixMonthsAgo.toISOString().slice(0, 10);
        const to = today.toISOString().slice(0, 10);

        const [membersResult, membershipsResult, financialsResult, accessStatsResult, accessesResult] =
          await Promise.allSettled([
          listMembers(),
          listMemberships(),
          getFinancialStatistics({ from, to, granularity: 'month' }),
          getAccessStatistics({ from: to, to, granularity: 'day', includePeak: true }),
          listRecentAccesses({ limit: 6 })
          ]);

        if (!active) return;

        const members = membersResult.status === 'fulfilled' ? membersResult.value : [];
        const memberships = membershipsResult.status === 'fulfilled' ? membershipsResult.value : [];
        const financials =
          financialsResult.status === 'fulfilled'
            ? financialsResult.value
            : { revenueOverTime: [], revenueByMethod: [], topPayingMembers: [] };
        const accessStats =
          accessStatsResult.status === 'fulfilled'
            ? accessStatsResult.value
            : { from: to, to, granularity: 'day' as const, series: [], peak: null };
        const accesses = accessesResult.status === 'fulfilled' ? accessesResult.value : [];

        const failedStats = [financialsResult, accessStatsResult].some((result) => result.status === 'rejected');
        const failedCore = [membersResult, membershipsResult, accessesResult].some((result) => result.status === 'rejected');

        setState({
          members,
          memberships,
          revenue: financials.revenueOverTime ?? [],
          accesses,
          todayAccesses: accessStats.series.reduce((sum, item) => sum + item.total, 0)
        });

        if (failedCore) {
          setError('No se pudieron cargar algunos datos del dashboard.');
        } else if (failedStats) {
          setError('Las estadisticas no estuvieron disponibles. El resto del panel sigue operativo.');
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const activeMembers = useMemo(
    () => state.members.filter((member) => member.active).length,
    [state.members]
  );

  const monthlyRevenue = useMemo(
    () => state.revenue.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [state.revenue]
  );

  const expiringSoon = useMemo(() => {
    const today = new Date();
    const limit = new Date(today);
    limit.setDate(today.getDate() + 7);

    return state.memberships.filter((membership) => {
      if (!['ACTIVE', 'DEBT'].includes(membership.membershipStatus)) return false;
      const endDate = new Date(membership.endDate);
      return !Number.isNaN(endDate.getTime()) && endDate >= today && endDate <= limit;
    }).length;
  }, [state.memberships]);

  const chartPoints = useMemo(() => {
    if (state.revenue.length === 0) return '';
    const values = state.revenue.map((item) => Number(item.amount ?? 0));
    const max = Math.max(...values, 1);

    return values
      .map((value, index) => {
        const x = state.revenue.length === 1 ? 400 : (index / (state.revenue.length - 1)) * 800;
        const y = 180 - (value / max) * 140;
        return `${x},${y}`;
      })
      .join(' ');
  }, [state.revenue]);

  const chartAreaPoints = useMemo(() => {
    if (!chartPoints) return '';
    return `0,180 ${chartPoints} 800,180`;
  }, [chartPoints]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Vision General</h1>
        </div>
        <button className="dashboard-primary" type="button" onClick={() => navigate('/admin/members/new')}>
          <span className="material-icons-round">add</span>
          Nuevo Socio
        </button>
      </div>

      {error && <div className="dashboard-feedback dashboard-feedback--error">{error}</div>}

      <div className="dashboard-cards">
        <div className="stat-card">
          <h3>Socios Activos</h3>
          <div className="stat-value">{loading ? '...' : activeMembers}</div>
          <div className="stat-foot muted">
            {loading ? 'Cargando socios' : `${state.members.length} registrados en total`}
          </div>
        </div>
        <div className="stat-card">
          <h3>Ingresos ultimos 6 meses</h3>
          <div className="stat-value">{loading ? '...' : formatCurrency(monthlyRevenue)}</div>
          <div className="stat-foot muted">
            {loading ? 'Cargando ingresos' : `${state.revenue.length} periodos con actividad`}
          </div>
        </div>
        <div className="stat-card">
          <h3>Vencen en 7 dias</h3>
          <div className="stat-value">{loading ? '...' : expiringSoon}</div>
          <div className={`stat-foot ${expiringSoon > 0 ? 'warning' : 'muted'}`}>
            {loading ? 'Calculando vencimientos' : expiringSoon > 0 ? 'Requiere seguimiento' : 'Sin alertas inmediatas'}
          </div>
        </div>
        <div className="stat-card">
          <h3>Accesos de hoy</h3>
          <div className="stat-value">{loading ? '...' : state.todayAccesses}</div>
          <div className="stat-foot muted">
            {loading ? 'Cargando accesos' : 'Actualizado con estadisticas reales'}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel-card chart-card">
          <h3>Ingresos ultimos 6 meses</h3>
          {state.revenue.length === 0 && !loading ? (
            <div className="dashboard-empty">Todavia no hay pagos registrados para graficar.</div>
          ) : (
            <div className="chart-wrapper">
              <svg viewBox="0 0 800 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fillGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chartAreaPoints && <polygon points={chartAreaPoints} fill="url(#fillGradient)" />}
                {chartPoints && <polyline points={chartPoints} fill="none" stroke="#3b82f6" strokeWidth="3" />}
                {state.revenue.map((item, index) => {
                  const values = state.revenue.map((entry) => Number(entry.amount ?? 0));
                  const max = Math.max(...values, 1);
                  const x = state.revenue.length === 1 ? 400 : (index / (state.revenue.length - 1)) * 800;
                  const y = 180 - (Number(item.amount ?? 0) / max) * 140;
                  return <circle key={`${item.label ?? item.date ?? index}`} cx={x} cy={y} r="4" fill="#3b82f6" />;
                })}
              </svg>
              <div className="chart-labels">
                {state.revenue.map((item, index) => (
                  <span key={`${item.label ?? item.date ?? index}`}>
                    {item.label ?? (item.date ? formatShortDate(item.date) : `P${index + 1}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="panel-card feed-card">
          <h3>Feed de Accesos</h3>
          {state.accesses.length === 0 && !loading ? (
            <div className="dashboard-empty">Todavia no hay accesos recientes para mostrar.</div>
          ) : (
            <div className="feed-list">
              {state.accesses.map((item) => (
                <div className="feed-row" key={item.id}>
                  <div className="feed-user">
                    <div className="feed-avatar">{(item.memberName || item.fullName || '?').charAt(0).toUpperCase()}</div>
                    <div className="feed-meta">
                      <span>{item.memberName || item.fullName || 'Socio sin nombre'}</span>
                      <small>{reasonLabel(item.reason)}</small>
                    </div>
                  </div>
                  <span className="feed-time">{formatAccessTime(item.accessedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
