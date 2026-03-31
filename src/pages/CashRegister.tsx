import { useEffect, useMemo, useState } from 'react';
import {
  closeCashRegister,
  downloadCashRegisterReport,
  getOpenCashRegister,
  openCashRegister
} from '../services/cash-register';
import type { CashRegisterCloseResponse, CashRegisterDto } from '../services/cash-register';
import { ApiError } from '../services/api';
import { listPayments } from '../services/payments';
import type { PaymentDto } from '../services/payments';
import type { PaymentMethod } from '../services/plans';
import './CashRegister.css';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  MP: 'Mercado Pago',
  OTHER: 'Otro'
};

const allMethods: PaymentMethod[] = ['CASH', 'CARD', 'TRANSFER', 'MP', 'OTHER'];

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const sameBusinessDay = (value?: string | null, businessDate?: string | null) => {
  if (!value || !businessDate) return false;
  const paymentDate = new Date(value).toISOString().slice(0, 10);
  return paymentDate === businessDate;
};

export default function CashRegister() {
  const [register, setRegister] = useState<CashRegisterDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [closeResult, setCloseResult] = useState<CashRegisterCloseResponse | null>(null);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [countedByMethod, setCountedByMethod] = useState<Record<PaymentMethod, string>>({
    CASH: '0',
    CARD: '0',
    TRANSFER: '0',
    MP: '0',
    OTHER: '0'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([getOpenCashRegister(), listPayments()])
      .then(([openRegister, paymentsData]) => {
        if (!mounted) return;
        setRegister(openRegister);
        setPayments(paymentsData);
        if (openRegister) {
          setOpeningBalance(String(openRegister.openingBalance ?? 0));
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        if (err instanceof ApiError && err.status === 403) {
          setError('Tu rol no tiene permisos para operar caja diaria.');
          return;
        }
        setError(err instanceof Error ? err.message : 'No se pudo cargar la caja.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const paymentsToday = useMemo(
    () => payments.filter((payment) => sameBusinessDay(payment.paidAt, register?.businessDate)),
    [payments, register?.businessDate]
  );

  const totalsByMethod = useMemo(() => {
    const totals: Record<PaymentMethod, number> = {
      CASH: 0,
      CARD: 0,
      TRANSFER: 0,
      MP: 0,
      OTHER: 0
    };
    paymentsToday.forEach((payment) => {
      totals[payment.paymentMethod] += Number(payment.amount || 0);
    });
    if (register) {
      totals.CASH += Number(register.openingBalance || 0);
    }
    return totals;
  }, [paymentsToday, register]);

  const expectedTotal = useMemo(
    () => allMethods.reduce((sum, method) => sum + totalsByMethod[method], 0),
    [totalsByMethod]
  );

  const countedTotal = useMemo(
    () => allMethods.reduce((sum, method) => sum + Number(countedByMethod[method] || 0), 0),
    [countedByMethod]
  );

  const difference = countedTotal - expectedTotal;

  async function handleOpen(event: React.FormEvent) {
    event.preventDefault();
    setOpening(true);
    setError('');
    setFeedback('');
    try {
      const opened = await openCashRegister(Number(openingBalance));
      setRegister(opened);
      setCloseResult(null);
      setFeedback('Caja abierta correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la caja.');
    } finally {
      setOpening(false);
    }
  }

  async function handleClose(event: React.FormEvent) {
    event.preventDefault();
    if (!register) return;

    setClosing(true);
    setError('');
    setFeedback('');
    try {
      const response = await closeCashRegister(
        register.id,
        allMethods.reduce<Record<PaymentMethod, number>>((acc, method) => {
          acc[method] = Number(countedByMethod[method] || 0);
          return acc;
        }, { CASH: 0, CARD: 0, TRANSFER: 0, MP: 0, OTHER: 0 })
      );
      setRegister(response.register);
      setCloseResult(response);
      setFeedback('Caja cerrada correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja.');
    } finally {
      setClosing(false);
    }
  }

  async function handleDownloadReport() {
    if (!register?.id) return;
    setDownloading(true);
    setError('');
    try {
      const { blob, fileName } = await downloadCashRegisterReport(register.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || `cash-register-${register.id}.pdf`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el reporte.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Caja Diaria</h1>
          <p>Apertura, seguimiento del turno, cierre operativo y descarga de PDF con el backend actual.</p>
        </div>
        <div className="console-actions">
          <button
            className="console-secondary"
            type="button"
            onClick={handleDownloadReport}
            disabled={!register?.pdfPath || downloading}
          >
            <span className="material-icons-round">picture_as_pdf</span>
            {downloading ? 'Descargando...' : 'Ver ultimo cierre'}
          </button>
        </div>
      </div>

      {error && <div className="cash-feedback cash-feedback--error">{error}</div>}
      {feedback && <div className="cash-feedback cash-feedback--success">{feedback}</div>}

      <div className="console-kpis">
        <section className="console-card">
          <div className="console-kpi-value">
            {register ? (register.status === 'OPEN' ? 'Abierta' : 'Cerrada') : 'Sin abrir'}
          </div>
          <div className="console-kpi-label">Estado actual</div>
          <div className="console-kpi-foot success">
            {register ? `Desde ${formatDateTime(register.openedAt)}` : 'Todavia no se abrio caja hoy'}
          </div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{formatCurrency(register?.expectedTotal ?? expectedTotal)}</div>
          <div className="console-kpi-label">Esperado al cierre</div>
          <div className="console-kpi-foot muted">Incluye saldo inicial y pagos del dia</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{formatCurrency(register?.difference ?? difference)}</div>
          <div className="console-kpi-label">Diferencia</div>
          <div className={`console-kpi-foot ${Number(register?.difference ?? difference) === 0 ? 'success' : 'warning'}`}>
            {register?.status === 'CLOSED' ? 'Resultado del cierre' : 'Simulacion en vivo'}
          </div>
        </section>
      </div>

      {!register ? (
        <section className="console-card cash-open-card">
          <div className="console-card-header">
            <div>
              <h2>Apertura de caja</h2>
              <p>Solo puede existir una caja abierta por tenant. Usa el endpoint real de apertura.</p>
            </div>
          </div>
          <form className="console-form-grid" onSubmit={handleOpen}>
            <div className="console-field">
              <label htmlFor="opening-balance">Saldo inicial</label>
              <input
                id="opening-balance"
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(event) => setOpeningBalance(event.target.value)}
                required
              />
            </div>
            <div className="cash-open-actions">
              <button className="console-primary" type="submit" disabled={opening}>
                {opening ? 'Abriendo...' : 'Abrir caja'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <div className="console-grid console-grid--two">
          <section className="console-card">
            <div className="console-card-header">
              <div>
                <h2>Arqueo y cierre</h2>
                <p>Completa el conteo por metodo y cierra usando el backend real.</p>
              </div>
            </div>
            <form className="console-form-grid" onSubmit={handleClose}>
              {allMethods.map((method) => (
                <div className="console-field" key={method}>
                  <label htmlFor={`counted-${method}`}>{paymentMethodLabels[method]} contado</label>
                  <input
                    id={`counted-${method}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={countedByMethod[method]}
                    onChange={(event) =>
                      setCountedByMethod((prev) => ({ ...prev, [method]: event.target.value }))
                    }
                    disabled={register.status === 'CLOSED'}
                  />
                </div>
              ))}
              <div className="cash-register-summary">
                <div className="console-stat-box">
                  <span>Total contado</span>
                  <strong>{formatCurrency(register.status === 'CLOSED' ? register.countedTotal : countedTotal)}</strong>
                </div>
                <div className="console-stat-box">
                  <span>Diferencia</span>
                  <strong>{formatCurrency(register.status === 'CLOSED' ? register.difference : difference)}</strong>
                </div>
              </div>
              <div className="cash-close-actions">
                <button
                  className="console-primary"
                  type="submit"
                  disabled={closing || register.status === 'CLOSED'}
                >
                  {register.status === 'CLOSED'
                    ? 'Caja cerrada'
                    : closing
                      ? 'Cerrando...'
                      : 'Cerrar caja'}
                </button>
              </div>
            </form>
          </section>

          <section className="console-card console-stack">
            <div className="console-card-header">
              <div>
                <h2>Totales del turno</h2>
                <p>Resumen por metodo con datos persistidos y pagos del dia.</p>
              </div>
            </div>
            <div className="console-list">
              {allMethods.map((method) => (
                <div className="console-list-item" key={method}>
                  <div>
                    <strong>{paymentMethodLabels[method]}</strong>
                    <small>
                      {closeResult
                        ? 'Esperado backend'
                        : method === 'CASH'
                          ? 'Incluye apertura + cobros'
                          : 'Pagos del dia'}
                    </small>
                  </div>
                  <span>
                    {formatCurrency(
                      closeResult?.expectedByMethod?.[method] ?? totalsByMethod[method]
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="console-note">
              Responsable apertura: {register.openedBy || 'No informado'} · Fecha negocio {register.businessDate}
            </div>
          </section>
        </div>
      )}

      <section className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Movimientos de caja</h2>
            <p>Pagos del dia que alimentan el esperado de caja.</p>
          </div>
        </div>
        {loading ? (
          <div className="console-note">Cargando caja y pagos...</div>
        ) : paymentsToday.length === 0 ? (
          <div className="console-note">No hay pagos registrados para la fecha de negocio actual.</div>
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Membresia</th>
                  <th>Metodo</th>
                  <th>Monto</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {paymentsToday.map((payment, index) => (
                  <tr key={`${payment.memberId}-${payment.membershipId}-${payment.paidAt}-${index}`}>
                    <td>{formatDateTime(payment.paidAt)}</td>
                    <td>#{payment.membershipId}</td>
                    <td>{paymentMethodLabels[payment.paymentMethod]}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>{payment.note || 'Sin nota'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
