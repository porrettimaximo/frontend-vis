import { useEffect, useMemo, useState } from 'react';
import { getAccessStatistics, getFinancialStatistics } from '../services/statistics';
import type { AccessStatsResponse, PaymentReportResponse } from '../services/statistics';
import './Reports.css';

type AccessSeriesPoint = {
  label: string;
  value: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

const formatBucketLabel = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    month: 'short',
    day: 'numeric',
    hour: value.includes('T') ? '2-digit' : undefined
  }).format(date);
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const buildDefaultRange = () => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);
  return {
    from: toIsoDate(from),
    to: toIsoDate(today)
  };
};

export default function Reports() {
  const defaultRange = buildDefaultRange();
  const [activeTab, setActiveTab] = useState<'payments' | 'access'>('payments');
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [financials, setFinancials] = useState<PaymentReportResponse | null>(null);
  const [accesses, setAccesses] = useState<AccessStatsResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([
      getFinancialStatistics({ from, to, granularity: 'day' }),
      getAccessStatistics({ from, to, granularity: 'day', includePeak: true })
    ])
      .then(([financialsData, accessData]) => {
        if (!mounted) return;
        setFinancials(financialsData);
        setAccesses(accessData);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [from, to]);

  const revenueSeries = financials?.revenueOverTime ?? [];
  const revenueByMethod = financials?.revenueByMethod ?? [];
  const topMembers = financials?.topPayingMembers ?? [];
  const accessSeries = accesses?.series ?? [];

  const totalRevenue = revenueSeries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalPayments = revenueSeries.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const averageTicket = totalPayments > 0 ? totalRevenue / totalPayments : 0;

  const paymentsChart = useMemo(() => {
    const max = Math.max(...revenueSeries.map((item) => Number(item.amount || 0)), 1);
    return revenueSeries.map((item) => ({
      label: formatBucketLabel(item.date),
      value: Number(item.amount || 0),
      width: `${(Number(item.amount || 0) / max) * 100}%`
    }));
  }, [revenueSeries]);

  const accessChart = useMemo<AccessSeriesPoint[]>(() => {
    return accessSeries.map((item) => ({
      label: formatBucketLabel(item.bucket),
      value: Number(item.total || 0)
    }));
  }, [accessSeries]);

  const peakLabel = accesses?.peak ? formatBucketLabel(accesses.peak.bucket) : '-';
  const peakTotal = accesses?.peak?.total ?? 0;

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>Reportes Operativos y Financieros</h1>
          <p>Solo Admin. Datos reales desde el backend de estadisticas.</p>
        </div>
        <div className="reports-filters">
          <button className="filter-toggle" type="button" onClick={() => setFiltersOpen((prev) => !prev)}>
            <span className="material-icons-round">tune</span>
            Filtrar
          </button>
        </div>
      </div>

      {error && <div className="reports-feedback reports-feedback--error">{error}</div>}

      {filtersOpen && (
        <section className="filters-panel">
          <div className="filter-group">
            <label>Rango de fechas</label>
            <div className="filter-row">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="filter-sep">a</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </section>
      )}

      <div className="reports-tabs">
        <button
          type="button"
          className={activeTab === 'payments' ? 'active' : ''}
          onClick={() => setActiveTab('payments')}
        >
          Pagos
        </button>
        <button
          type="button"
          className={activeTab === 'access' ? 'active' : ''}
          onClick={() => setActiveTab('access')}
        >
          Accesos
        </button>
      </div>

      {loading ? (
        <section className="report-card">
          <div className="reports-empty">Cargando reportes...</div>
        </section>
      ) : activeTab === 'payments' ? (
        <div className="reports-grid">
          <section className="report-card kpi-card">
            <div className="kpi-row">
              <div>
                <h3>Total periodo</h3>
                <div className="kpi-value">{formatCurrency(totalRevenue)}</div>
              </div>
              <span className="kpi-badge success">{totalPayments} pagos</span>
            </div>
            <div className="kpi-row">
              <div>
                <h3>Ticket promedio</h3>
                <div className="kpi-value">{formatCurrency(averageTicket)}</div>
              </div>
              <span className="kpi-badge muted">Promedio</span>
            </div>
            <div className="kpi-row">
              <div>
                <h3>Mejor socio</h3>
                <div className="kpi-value">{topMembers[0]?.label || '-'}</div>
              </div>
              <span className="kpi-badge warning">
                {topMembers[0] ? formatCurrency(Number(topMembers[0].amount || 0)) : 'Sin datos'}
              </span>
            </div>
          </section>

          <section className="report-card chart-card wave-card">
            <h3>Pagos por periodo</h3>
            <div className="reports-bars">
              {paymentsChart.length === 0 ? (
                <div className="reports-empty">Sin datos para el rango seleccionado.</div>
              ) : (
                paymentsChart.map((point) => (
                  <div key={point.label} className="reports-bar-row">
                    <span>{point.label}</span>
                    <div className="reports-bar-track">
                      <div style={{ width: point.width }} />
                    </div>
                    <strong>{formatCurrency(point.value)}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="report-card method-card">
            <h3>Pagos por medio</h3>
            <div className="method-list">
              {revenueByMethod.length === 0 ? (
                <div className="reports-empty">Sin medios registrados.</div>
              ) : (
                revenueByMethod.map((method) => (
                  <div key={method.label || method.date} className="method-row">
                    <span>{method.label}</span>
                    <div className="method-bar">
                      <div
                        style={{
                          width: `${(Number(method.amount || 0) / Math.max(totalRevenue, 1)) * 100}%`
                        }}
                      />
                    </div>
                    <strong>{formatCurrency(Number(method.amount || 0))}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="report-card ranking-card">
            <h3>Ranking de socios por monto</h3>
            <div className="ranking-list">
              {topMembers.length === 0 ? (
                <div className="reports-empty">Sin ranking disponible.</div>
              ) : (
                topMembers.map((row, index) => (
                  <div key={`${row.label}-${index}`} className="ranking-row">
                    <div>
                      <div className="ranking-name">{row.label}</div>
                      <div className="ranking-sub">{row.count} pagos</div>
                    </div>
                    <strong>{formatCurrency(Number(row.amount || 0))}</strong>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="reports-grid">
          <section className="report-card chart-card wave-card">
            <h3>Accesos por dia</h3>
            <div className="reports-bars">
              {accessChart.length === 0 ? (
                <div className="reports-empty">Sin accesos para el rango seleccionado.</div>
              ) : (
                accessChart.map((point) => (
                  <div key={point.label} className="reports-bar-row">
                    <span>{point.label}</span>
                    <div className="reports-bar-track reports-bar-track--success">
                      <div
                        style={{
                          width: `${(point.value / Math.max(...accessChart.map((item) => item.value), 1)) * 100}%`
                        }}
                      />
                    </div>
                    <strong>{point.value}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="report-card kpi-card">
            <div className="kpi-row">
              <div>
                <h3>Accesos periodo</h3>
                <div className="kpi-value">{accessChart.reduce((sum, item) => sum + item.value, 0)}</div>
              </div>
              <span className="kpi-badge success">GRANTED</span>
            </div>
            <div className="kpi-row">
              <div>
                <h3>Pico</h3>
                <div className="kpi-value">{peakLabel}</div>
              </div>
              <span className="kpi-badge warning">{peakTotal} ingresos</span>
            </div>
            <div className="kpi-row">
              <div>
                <h3>Promedio diario</h3>
                <div className="kpi-value">
                  {accessChart.length > 0
                    ? Math.round(accessChart.reduce((sum, item) => sum + item.value, 0) / accessChart.length)
                    : 0}
                </div>
              </div>
              <span className="kpi-badge muted">Serie actual</span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
