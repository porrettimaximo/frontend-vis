import { useEffect, useMemo, useState } from 'react';
import { listRecentAccesses } from '../services/access';
import './AccessAudit.css';

type AccessLogEntry = {
  id: number;
  datetime: string;
  memberName: string;
  memberCode: string;
  allowed: boolean;
  reason: string;
  creditsBefore: number | null;
  creditsAfter: number | null;
  creditsDiscounted: boolean;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

const today = new Date().toISOString().slice(0, 10);
const weekStart = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const normalizeReason = (reason?: string | null) => reason?.trim().toUpperCase() ?? '';

const reasonLabel = (reason?: string | null) => {
  const normalized = normalizeReason(reason);
  if (!normalized) return '-';
  if (normalized === 'DEUDA_PENDIENTE') return 'Deuda pendiente';
  if (normalized === 'MEMBRESIA_NO_VIGENTE') return 'Membresia no vigente';
  if (normalized === 'NO_CREDITS') return 'Sin creditos';
  if (normalized === 'SOCIO_INACTIVO') return 'Socio inactivo';
  if (normalized === 'ALREADY_GRANTED_TODAY') return 'Ya ingreso hoy';
  if (normalized === 'GRANTED_CHARGED') return 'Ingreso con descuento';
  if (normalized === 'GRANTED_NO_CHARGE') return 'Ingreso sin descuento';
  return normalized.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
};

const isAllowedResult = (result: boolean | string) => {
  if (typeof result === 'boolean') return result;
  return result.trim().toUpperCase() === 'GRANTED';
};

export default function AccessAudit() {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: weekStart,
    dateTo: today,
    memberQuery: '',
    resultFilter: 'all' as 'all' | 'allowed' | 'denied',
    reasonFilter: 'all'
  });
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    listRecentAccesses({
      limit: 100,
      query: filters.memberQuery || undefined,
      result: filters.resultFilter,
      reason: filters.reasonFilter,
      from: filters.dateFrom || undefined,
      to: filters.dateTo || undefined
    })
      .then((data) => {
        if (!mounted) return;
        setLogs(
          data.map((entry) => {
            const allowed = isAllowedResult(entry.result);
            const creditsBefore = entry.creditsBefore ?? null;
            const creditsAfter = entry.creditsAfter ?? null;

            return {
              id: entry.id,
              datetime: entry.accessedAt,
              memberName: entry.memberName || entry.fullName || 'Socio sin nombre',
              memberCode: entry.memberCode || '-',
              allowed,
              reason: reasonLabel(entry.reason),
              creditsBefore,
              creditsAfter,
              creditsDiscounted:
                allowed &&
                creditsBefore !== null &&
                creditsAfter !== null &&
                creditsAfter < creditsBefore
            };
          })
        );
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoria de accesos.');
        setLogs([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filters]);

  const metrics = useMemo(() => {
    const allowed = logs.filter((entry) => entry.allowed).length;
    const denied = logs.length - allowed;
    const discounted = logs.filter((entry) => entry.creditsDiscounted).length;
    return { allowed, denied, discounted };
  }, [logs]);

  return (
    <div className="access-audit-page">
      <div className="access-audit-header">
        <div>
          <h1>Registro de Accesos</h1>
          <p>Auditoria completa de accesos con motivos y descuento de creditos.</p>
        </div>
      </div>

      <section className="audit-filters">
        <div className="filter-group range">
          <label>Rango de fechas</label>
          <div className="filter-row">
            <input
              type="date"
              value={draft.dateFrom}
              onChange={(event) => setDraft((prev) => ({ ...prev, dateFrom: event.target.value }))}
            />
            <span className="filter-sep">a</span>
            <input
              type="date"
              value={draft.dateTo}
              onChange={(event) => setDraft((prev) => ({ ...prev, dateTo: event.target.value }))}
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Socio</label>
          <input
            type="text"
            placeholder="Buscar por nombre, codigo o DNI"
            value={draft.memberQuery}
            onChange={(event) => setDraft((prev) => ({ ...prev, memberQuery: event.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>Resultado</label>
          <select
            value={draft.resultFilter}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                resultFilter: event.target.value as typeof filters.resultFilter
              }))
            }
          >
            <option value="all">Todos</option>
            <option value="allowed">Permitido</option>
            <option value="denied">Denegado</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Motivo</label>
          <select
            value={draft.reasonFilter}
            onChange={(event) => setDraft((prev) => ({ ...prev, reasonFilter: event.target.value }))}
          >
            <option value="all">Todos</option>
            <option value="DEUDA_PENDIENTE">Deuda pendiente</option>
            <option value="MEMBRESIA_NO_VIGENTE">Membresia no vigente</option>
            <option value="NO_CREDITS">Sin creditos</option>
            <option value="SOCIO_INACTIVO">Socio inactivo</option>
            <option value="ALREADY_GRANTED_TODAY">Ya ingreso hoy</option>
          </select>
        </div>
        <div className="filter-actions">
          <button type="button" onClick={() => setFilters(draft)}>
            Aplicar filtros
          </button>
        </div>
      </section>

      {error && <div className="audit-feedback audit-feedback--error">{error}</div>}

      <section className="audit-summary">
        <article className="audit-metric-card">
          <span>Registros</span>
          <strong>{logs.length}</strong>
        </article>
        <article className="audit-metric-card success">
          <span>Permitidos</span>
          <strong>{metrics.allowed}</strong>
        </article>
        <article className="audit-metric-card danger">
          <span>Denegados</span>
          <strong>{metrics.denied}</strong>
        </article>
        <article className="audit-metric-card">
          <span>Con descuento</span>
          <strong>{metrics.discounted}</strong>
        </article>
      </section>

      <section className="audit-table-card">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Socio</th>
              <th>Resultado</th>
              <th>Motivo</th>
              <th>Creditos descontados</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="audit-empty">
                  Cargando auditoria de accesos...
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.datetime)}</td>
                  <td>
                    <div className="audit-member">
                      <div className="audit-avatar">{entry.memberName.charAt(0)}</div>
                      <div>
                        <div className="audit-name">{entry.memberName}</div>
                        <div className="audit-code">Codigo {entry.memberCode}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`audit-pill ${entry.allowed ? 'allowed' : 'denied'}`}>
                      {entry.allowed ? 'Permitido' : 'Denegado'}
                    </span>
                  </td>
                  <td>{entry.allowed ? '-' : entry.reason}</td>
                  <td>{entry.allowed && entry.creditsDiscounted ? 'Si' : 'No'}</td>
                </tr>
              ))
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="audit-empty">
                  Sin resultados para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
