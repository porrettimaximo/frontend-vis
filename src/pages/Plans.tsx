import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../services/api';
import { listMembers } from '../services/members';
import {
  createMembership,
  createPlan,
  deactivateMembership,
  deactivatePlan,
  listMemberships,
  listPlans,
  reactivatePlan
} from '../services/plans';
import type {
  EntryPolicy,
  MembershipDto,
  MembershipStatus,
  PaymentMethod,
  PlanDto
} from '../services/plans';
import type { MemberDto } from '../services/members';
import './Plans.css';

const entryPolicyLabels: Record<EntryPolicy, string> = {
  CHARGE_ONCE_PER_DAY: 'Cobra una vez por dia',
  DENY_REPEATS_SAME_DAY: 'Rechaza repetidas',
  CHARGE_EVERY_TIME: 'Cobra cada vez'
};

const membershipStatusLabels: Record<MembershipStatus, string> = {
  ACTIVE: 'Vigente',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada',
  DEBT: 'Con deuda'
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'MP', label: 'Mercado Pago' },
  { value: 'OTHER', label: 'Otro' }
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date);
};

export default function Plans() {
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [memberships, setMemberships] = useState<MembershipDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingMembership, setCreatingMembership] = useState(false);
  const [planActionId, setPlanActionId] = useState<number | null>(null);
  const [membershipActionId, setMembershipActionId] = useState<number | null>(null);

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '0',
    durationDays: '30',
    creditLimit: '0',
    active: true,
    entryPolicy: 'CHARGE_ONCE_PER_DAY' as EntryPolicy
  });

  const [membershipForm, setMembershipForm] = useState({
    memberId: '',
    planId: '',
    startDate: new Date().toISOString().slice(0, 10),
    amountPaid: '',
    paymentMethod: 'CASH' as PaymentMethod,
    paymentNote: ''
  });

  useEffect(() => {
    let mounted = true;

    Promise.all([listPlans(), listMemberships(), listMembers()])
      .then(([plansData, membershipsData, membersData]) => {
        if (!mounted) return;
        setPlans(plansData);
        setMemberships(membershipsData);
        setMembers(membersData);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar planes y membresias.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const membershipsEnriched = useMemo(() => {
    const membersById = new Map(members.map((member) => [member.id, member]));
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    return memberships
      .slice()
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .map((membership) => ({
        ...membership,
        memberName: membersById.get(membership.memberId)
          ? `${membersById.get(membership.memberId)?.firstName} ${membersById.get(membership.memberId)?.lastName}`
          : `Socio #${membership.memberId}`,
        planName: plansById.get(membership.planId)?.name || `Plan #${membership.planId}`
      }));
  }, [members, memberships, plans]);

  const activePlans = plans.filter((plan) => plan.active).length;
  const activeMemberships = memberships.filter((membership) => membership.membershipStatus === 'ACTIVE').length;
  const renewingSoon = memberships.filter((membership) => {
    const end = new Date(membership.endDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  async function handleCreatePlan(event: React.FormEvent) {
    event.preventDefault();
    setCreatingPlan(true);
    setError('');
    setFeedback('');
    try {
      const created = await createPlan(
        {
          name: planForm.name,
          description: planForm.description,
          price: Number(planForm.price),
          durationDays: Number(planForm.durationDays),
          creditLimit: Number(planForm.creditLimit),
          active: planForm.active
        },
        planForm.entryPolicy
      );
      setPlans((prev) => [...prev, created]);
      setPlanForm({
        name: '',
        description: '',
        price: '0',
        durationDays: '30',
        creditLimit: '0',
        active: true,
        entryPolicy: 'CHARGE_ONCE_PER_DAY'
      });
      setFeedback('Plan creado correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el plan.');
    } finally {
      setCreatingPlan(false);
    }
  }

  async function handleTogglePlan(plan: PlanDto) {
    setPlanActionId(plan.id);
    setError('');
    setFeedback('');
    try {
      if (plan.active) {
        await deactivatePlan(plan.id);
        setPlans((prev) => prev.map((item) => (item.id === plan.id ? { ...item, active: false } : item)));
        setFeedback(`Plan ${plan.name} desactivado.`);
      } else {
        const reactivated = await reactivatePlan(plan.id);
        setPlans((prev) => prev.map((item) => (item.id === plan.id ? reactivated : item)));
        setFeedback(`Plan ${plan.name} reactivado.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el plan.');
    } finally {
      setPlanActionId(null);
    }
  }

  async function handleCreateMembership(event: React.FormEvent) {
    event.preventDefault();
    setCreatingMembership(true);
    setError('');
    setFeedback('');
    try {
      const created = await createMembership({
        memberId: Number(membershipForm.memberId),
        planId: Number(membershipForm.planId),
        startDate: membershipForm.startDate,
        amountPaid: Number(membershipForm.amountPaid),
        paymentMethod: membershipForm.paymentMethod,
        paymentNote: membershipForm.paymentNote || undefined
      });
      setMemberships((prev) => [created, ...prev]);
      setMembershipForm((prev) => ({
        ...prev,
        memberId: '',
        planId: '',
        amountPaid: '',
        paymentNote: ''
      }));
      setFeedback('Membresia creada correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la membresia.');
    } finally {
      setCreatingMembership(false);
    }
  }

  async function handleDeactivateMembership(membership: MembershipDto) {
    setMembershipActionId(membership.id);
    setError('');
    setFeedback('');
    try {
      await deactivateMembership(membership.id);
      setMemberships((prev) =>
        prev.map((item) =>
          item.id === membership.id ? { ...item, membershipStatus: 'CANCELLED' } : item
        )
      );
      setFeedback(`Membresia ${membership.id} desactivada.`);
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 500
          ? 'El backend no pudo desactivar la membresia. Revisar estado actual.'
          : err instanceof Error
            ? err.message
            : 'No se pudo desactivar la membresia.';
      setError(message);
    } finally {
      setMembershipActionId(null);
    }
  }

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Planes y Membresias</h1>
          <p>Organiza la oferta comercial, las politicas de acceso y la activacion comercial de socios.</p>
        </div>
      </div>

      {error && <div className="plans-feedback plans-feedback--error">{error}</div>}
      {feedback && <div className="plans-feedback plans-feedback--success">{feedback}</div>}

      <div className="console-kpis">
        <section className="console-card">
          <div className="console-kpi-value">{activePlans}</div>
          <div className="console-kpi-label">Planes activos</div>
          <div className="console-kpi-foot muted">Sobre {plans.length || 0} planes cargados</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{activeMemberships}</div>
          <div className="console-kpi-label">Membresias vigentes</div>
          <div className="console-kpi-foot success">{memberships.length} membresias totales</div>
        </section>
        <section className="console-card">
          <div className="console-kpi-value">{renewingSoon}</div>
          <div className="console-kpi-label">Renovaciones proximas</div>
          <div className="console-kpi-foot warning">Vencen dentro de 7 dias</div>
        </section>
      </div>

      <div className="console-grid console-grid--two">
        <section className="console-card">
          <div className="console-card-header">
            <div>
              <h2>Nuevo plan</h2>
              <p>Alta de planes usando el backend actual con politica de ingreso.</p>
            </div>
          </div>
          <form className="console-form-grid" onSubmit={handleCreatePlan}>
            <div className="console-field">
              <label htmlFor="plan-name">Nombre</label>
              <input
                id="plan-name"
                value={planForm.name}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="console-field">
              <label htmlFor="plan-policy">Politica de ingreso</label>
              <select
                id="plan-policy"
                value={planForm.entryPolicy}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, entryPolicy: event.target.value as EntryPolicy }))
                }
              >
                {Object.entries(entryPolicyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="console-field console-field--full">
              <label htmlFor="plan-description">Descripcion</label>
              <textarea
                id="plan-description"
                value={planForm.description}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))}
                required
              />
            </div>
            <div className="console-field">
              <label htmlFor="plan-price">Precio</label>
              <input
                id="plan-price"
                type="number"
                min="0"
                step="0.01"
                value={planForm.price}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </div>
            <div className="console-field">
              <label htmlFor="plan-duration">Duracion en dias</label>
              <input
                id="plan-duration"
                type="number"
                min="1"
                value={planForm.durationDays}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, durationDays: event.target.value }))}
                required
              />
            </div>
            <div className="console-field">
              <label htmlFor="plan-credits">Limite de creditos</label>
              <input
                id="plan-credits"
                type="number"
                min="0"
                value={planForm.creditLimit}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, creditLimit: event.target.value }))}
                required
              />
            </div>
            <div className="console-field">
              <label htmlFor="plan-active">Estado inicial</label>
              <select
                id="plan-active"
                value={planForm.active ? 'true' : 'false'}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, active: event.target.value === 'true' }))
                }
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
            <div className="plans-form-actions plans-form-actions--full">
              <button className="console-primary" type="submit" disabled={creatingPlan}>
                {creatingPlan ? 'Creando...' : 'Crear plan'}
              </button>
            </div>
          </form>
        </section>

        <section className="console-card">
          <div className="console-card-header">
            <div>
              <h2>Nueva membresia</h2>
              <p>Alta comercial de membresias con pago inicial.</p>
            </div>
          </div>
          <form className="console-form-grid" onSubmit={handleCreateMembership}>
            <div className="console-field">
              <label htmlFor="membership-member">Socio</label>
              <select
                id="membership-member"
                value={membershipForm.memberId}
                onChange={(event) => setMembershipForm((prev) => ({ ...prev, memberId: event.target.value }))}
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
              <label htmlFor="membership-plan">Plan</label>
              <select
                id="membership-plan"
                value={membershipForm.planId}
                onChange={(event) => setMembershipForm((prev) => ({ ...prev, planId: event.target.value }))}
                required
              >
                <option value="">Seleccionar plan</option>
                {plans.filter((plan) => plan.active).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="console-field">
              <label htmlFor="membership-start">Fecha inicio</label>
              <input
                id="membership-start"
                type="date"
                value={membershipForm.startDate}
                onChange={(event) => setMembershipForm((prev) => ({ ...prev, startDate: event.target.value }))}
                required
              />
            </div>
            <div className="console-field">
              <label htmlFor="membership-amount">Monto pagado</label>
              <input
                id="membership-amount"
                type="number"
                min="0"
                step="0.01"
                value={membershipForm.amountPaid}
                onChange={(event) => setMembershipForm((prev) => ({ ...prev, amountPaid: event.target.value }))}
                required
              />
            </div>
            <div className="console-field">
              <label htmlFor="membership-method">Metodo de pago</label>
              <select
                id="membership-method"
                value={membershipForm.paymentMethod}
                onChange={(event) =>
                  setMembershipForm((prev) => ({ ...prev, paymentMethod: event.target.value as PaymentMethod }))
                }
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="console-field console-field--full">
              <label htmlFor="membership-note">Nota de pago</label>
              <textarea
                id="membership-note"
                value={membershipForm.paymentNote}
                onChange={(event) => setMembershipForm((prev) => ({ ...prev, paymentNote: event.target.value }))}
              />
            </div>
            <div className="plans-form-actions plans-form-actions--full">
              <button className="console-primary" type="submit" disabled={creatingMembership}>
                {creatingMembership ? 'Creando...' : 'Crear membresia'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="console-grid console-grid--wide">
        <section className="console-card">
          <div className="console-card-header">
            <div>
              <h2>Catalogo de planes</h2>
              <p>Resumen operativo para ventas, renovaciones y reglas de acceso.</p>
            </div>
          </div>
          {loading ? (
            <div className="console-note">Cargando planes...</div>
          ) : plans.length === 0 ? (
            <div className="console-note">Todavia no hay planes cargados.</div>
          ) : (
            <div className="console-table-wrap">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Precio</th>
                    <th>Duracion</th>
                    <th>Politica</th>
                    <th>Creditos</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <div className="plans-plan-cell">
                          <strong>{plan.name}</strong>
                          <small>{plan.description}</small>
                        </div>
                      </td>
                      <td>{formatCurrency(Number(plan.price))}</td>
                      <td>{plan.durationDays} dias</td>
                      <td>{entryPolicyLabels[plan.entryPolicy]}</td>
                      <td>{plan.creditLimit ?? '-'}</td>
                      <td>
                        <span className={`console-badge ${plan.active ? 'success' : 'warning'}`}>
                          {plan.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="console-secondary"
                          type="button"
                          onClick={() => handleTogglePlan(plan)}
                          disabled={planActionId === plan.id}
                        >
                          {planActionId === plan.id
                            ? 'Procesando...'
                            : plan.active
                              ? 'Desactivar'
                              : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="console-card console-stack">
          <div className="console-card-header">
            <div>
              <h2>Membresias recientes</h2>
              <p>Seguimiento de altas comerciales y renovaciones.</p>
            </div>
          </div>
          {loading ? (
            <div className="console-note">Cargando membresias...</div>
          ) : membershipsEnriched.length === 0 ? (
            <div className="console-note">Todavia no hay membresias registradas.</div>
          ) : (
            membershipsEnriched.slice(0, 8).map((membership) => (
              <div className="console-list-item" key={membership.id}>
                <div>
                  <strong>{membership.memberName}</strong>
                  <small>
                    {membership.planName} · {formatDate(membership.endDate)}
                  </small>
                </div>
                <div className="plans-right">
                  <span
                    className={`console-badge ${
                      membership.membershipStatus === 'ACTIVE'
                        ? 'success'
                        : membership.membershipStatus === 'DEBT'
                          ? 'warning'
                          : 'danger'
                    }`}
                  >
                    {membershipStatusLabels[membership.membershipStatus]}
                  </span>
                  <button
                    className="console-secondary"
                    type="button"
                    onClick={() => handleDeactivateMembership(membership)}
                    disabled={
                      membershipActionId === membership.id ||
                      membership.membershipStatus === 'CANCELLED'
                    }
                  >
                    {membershipActionId === membership.id ? 'Procesando...' : 'Desactivar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
