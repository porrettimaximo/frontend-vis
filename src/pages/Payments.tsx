import { useEffect, useMemo, useState } from 'react';
import { listMembers } from '../services/members';
import type { MemberDto } from '../services/members';
import { listMemberships, type MembershipDto, type PaymentMethod } from '../services/plans';
import { createPayment, listPayments } from '../services/payments';
import type { PaymentDto } from '../services/payments';
import './Payments.css';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  MP: 'Mercado Pago',
  OTHER: 'Otro'
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date);
};

export default function Payments() {
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [memberships, setMemberships] = useState<MembershipDto[]>([]);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    memberId: '',
    membershipId: '',
    method: 'CARD' as PaymentMethod,
    amount: '',
    note: ''
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([listMembers(), listMemberships(), listPayments()])
      .then(([membersData, membershipsData, paymentsData]) => {
        if (!mounted) return;
        setMembers(membersData);
        setMemberships(membershipsData);
        setPayments(paymentsData);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredMemberships = useMemo(
    () =>
      memberships.filter((membership) =>
        form.memberId ? membership.memberId === Number(form.memberId) : true
      ),
    [form.memberId, memberships]
  );

  const paymentsView = useMemo(() => {
    const membersById = new Map(members.map((member) => [member.id, member]));
    const membershipsById = new Map(memberships.map((membership) => [membership.id, membership]));

    return payments
      .slice()
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
      .map((payment, index) => {
        const member = membersById.get(payment.memberId);
        const membership = membershipsById.get(payment.membershipId);
        return {
          key: `${payment.receiptId ?? 'PAY'}-${payment.memberId}-${payment.membershipId}-${index}`,
          receiptLabel: payment.receiptId ? `REC-${payment.receiptId}` : `PAY-${index + 1}`,
          memberName: member ? `${member.firstName} ${member.lastName}` : `Socio #${payment.memberId}`,
          concept: membership ? `Membresia #${membership.id}` : `Membresia #${payment.membershipId}`,
          method: paymentMethodLabels[payment.paymentMethod],
          amount: payment.amount,
          paidAt: payment.paidAt,
          note: payment.note
        };
      });
  }, [members, memberships, payments]);

  const totalCollected = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paymentCount = payments.length;
  const byMethod = payments.reduce<Record<PaymentMethod, number>>(
    (acc, payment) => {
      acc[payment.paymentMethod] += Number(payment.amount || 0);
      return acc;
    },
    { CASH: 0, CARD: 0, TRANSFER: 0, MP: 0, OTHER: 0 }
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      const created = await createPayment({
        memberId: Number(form.memberId),
        membershipId: Number(form.membershipId),
        paymentMethod: form.method,
        amount: Number(form.amount),
        note: form.note
      });
      setPayments((prev) => [created, ...prev]);
      setForm({
        memberId: '',
        membershipId: '',
        method: 'CARD',
        amount: '',
        note: ''
      });
      setFeedback('Pago registrado correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Pagos y Cobros</h1>
          <p>Registro real de cobros asociados a socios y membresias vigentes.</p>
        </div>
      </div>

      {error && <div className="payments-feedback payments-feedback--error">{error}</div>}
      {feedback && <div className="payments-feedback payments-feedback--success">{feedback}</div>}

      <div className="console-kpis">
        <section className="console-card">
          <div className="console-kpi-value">{formatMoney(totalCollected)}</div>
          <div className="console-kpi-label">Cobrado total</div>
          <div className="console-kpi-foot success">{paymentCount} pagos registrados</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{formatMoney(byMethod.CARD + byMethod.MP)}</div>
          <div className="console-kpi-label">Digital</div>
          <div className="console-kpi-foot muted">Tarjeta + Mercado Pago</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{formatMoney(byMethod.CASH)}</div>
          <div className="console-kpi-label">Efectivo</div>
          <div className="console-kpi-foot warning">Base para caja diaria</div>
        </section>
      </div>

      <div className="console-grid console-grid--two">
        <section className="console-card">
          <div className="console-card-header">
            <div>
              <h2>Cobro rapido</h2>
              <p>Alta de pago con contratos actuales del backend.</p>
            </div>
          </div>
          <form className="console-form-grid" onSubmit={handleSubmit}>
            <div className="console-field">
              <label htmlFor="payment-member">Socio</label>
              <select
                id="payment-member"
                value={form.memberId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, memberId: event.target.value, membershipId: '' }))
                }
                required
              >
                <option value="">Seleccionar socio</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="console-field">
              <label htmlFor="payment-membership">Membresia</label>
              <select
                id="payment-membership"
                value={form.membershipId}
                onChange={(event) => setForm((prev) => ({ ...prev, membershipId: event.target.value }))}
                required
              >
                <option value="">Seleccionar membresia</option>
                {filteredMemberships.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    #{membership.id} · {membership.membershipStatus}
                  </option>
                ))}
              </select>
            </div>
            <div className="console-field">
              <label htmlFor="payment-method">Metodo</label>
              <select
                id="payment-method"
                value={form.method}
                onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value as PaymentMethod }))}
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="console-field">
              <label htmlFor="payment-amount">Monto</label>
              <input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
            </div>
            <div className="console-field console-field--full">
              <label htmlFor="payment-notes">Notas</label>
              <textarea
                id="payment-notes"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Observaciones del cobro"
              />
            </div>
            <div className="payments-actions">
              <button className="console-primary" type="submit" disabled={submitting}>
                {submitting ? 'Registrando...' : 'Registrar cobro'}
              </button>
            </div>
          </form>
        </section>

        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Seguimiento del turno</h2>
              <p>Distribucion por medio de pago para preparar caja y reportes.</p>
            </div>
          </div>
          {Object.entries(paymentMethodLabels).map(([method, label]) => (
            <div className="console-list-item" key={method}>
              <div>
                <strong>{label}</strong>
                <small>Acumulado actual</small>
              </div>
              <span>{formatMoney(byMethod[method as PaymentMethod])}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="console-card">
        <div className="console-card-header">
          <div>
            <h2>Movimientos recientes</h2>
            <p>Listado de cobros persistidos en el backend.</p>
          </div>
        </div>
        {loading ? (
          <div className="console-note">Cargando pagos...</div>
        ) : paymentsView.length === 0 ? (
          <div className="console-note">Todavia no hay pagos registrados.</div>
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Socio</th>
                  <th>Concepto</th>
                  <th>Metodo</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {paymentsView.map((row) => (
                  <tr key={row.key}>
                    <td>{row.receiptLabel}</td>
                    <td>{row.memberName}</td>
                    <td>
                      <div className="payments-concept">
                        <strong>{row.concept}</strong>
                        <small>{row.note || 'Sin nota'}</small>
                      </div>
                    </td>
                    <td>{row.method}</td>
                    <td>{formatMoney(Number(row.amount))}</td>
                    <td>{formatDate(row.paidAt)}</td>
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
