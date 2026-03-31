import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCurrentRole } from '../authz';
import { buildAssetUrl } from '../services/api';
import { deactivateMember, getMember } from '../services/members';
import type { MemberDto } from '../services/members';
import './MemberDetail.css';

export default function MemberDetail() {
  const role = getCurrentRole();
  const canManageMember = role === 'ADMIN' || role === 'RECEPCIONISTA';
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const memberId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    if (!memberId || Number.isNaN(memberId)) {
      setErrorMessage("ID de socio invalido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    getMember(memberId)
      .then((data) => setMember(data))
      .catch((error) => {
        const message = error?.message || "No se pudo cargar el socio.";
        setErrorMessage(message);
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  const photoSrc = buildAssetUrl(member?.photoUrl);
  const membershipStatusLabel = member?.membershipStatus
    ? {
        ACTIVE: 'Vigente',
        DEBT: 'Con deuda',
        EXPIRED: 'Vencida',
        CANCELLED: 'Cancelada'
      }[member.membershipStatus]
    : 'Sin datos';

  const age = useMemo(() => {
    if (!member?.birthDate) return null;
    const birth = new Date(member.birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      years -= 1;
    }
    return years;
  }, [member?.birthDate]);

  async function handleDeactivate() {
    if (!member) return;
    const confirmed = window.confirm(`Dar de baja a ${member.firstName} ${member.lastName}?`);
    if (!confirmed) return;

    setDeactivating(true);
    try {
      await deactivateMember(member.id);
      setMember((prev) => (prev ? { ...prev, active: false } : prev));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo dar de baja el socio.');
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <div className="member-detail-page">
      <div className="member-detail-header">
        <div>
          <h1>Detalle de Socio</h1>
          <p>Detalle y estado del socio.</p>
        </div>
        <div className="member-detail-actions">
          <Link className="btn-ghost btn-link" to={`/admin/members/${memberId}/medical`}>
            <span className="material-icons-outlined">health_and_safety</span>
            Perfil Medico
          </Link>
          {canManageMember && (
            <>
              <button className="btn-primary" type="button" disabled title="Edicion completa proxima etapa">
                <span className="material-icons-outlined">edit</span>
                Modificar pronto
              </button>
              <button className="btn-danger" type="button" onClick={handleDeactivate} disabled={deactivating}>
                <span className="material-icons-outlined">person_remove</span>
                {deactivating ? 'Procesando...' : 'Dar de Baja'}
              </button>
            </>
          )}
          <button className="btn-ghost" onClick={() => navigate(-1)} type="button">
            Volver
          </button>
        </div>
      </div>

      {loading && <div className="member-detail__state">Cargando socio...</div>}
      {!loading && errorMessage && (
        <div className="member-detail__state error">{errorMessage}</div>
      )}

      {!loading && !errorMessage && member && (
        <div className="member-detail-grid">
          <div className="member-detail-column">
            <section className="detail-card profile-card">
              <div className="profile-photo">
                {photoSrc ? (
                  <img src={photoSrc} alt={`${member.firstName} ${member.lastName}`} />
                ) : (
                  <span className="material-icons-outlined">person</span>
                )}
                <span className={`status-dot ${member.active ? "is-active" : "is-inactive"}`} />
              </div>
              <h2>
                {member.firstName} {member.lastName}
              </h2>
              <p className={`status-pill ${member.active ? "is-active" : "is-inactive"}`}>
                {member.active ? "Activo" : "Inactivo"}
              </p>
              <div className="contact-list">
                <div className="contact-item">
                  <span className="material-icons-outlined">email</span>
                  <div>
                    <p>Email</p>
                    <strong>{member.email || "-"}</strong>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">phone</span>
                  <div>
                    <p>Telefono</p>
                    <strong>{member.phone || "-"}</strong>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">place</span>
                  <div>
                    <p>Direccion</p>
                    <strong>{member.address || "-"}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="detail-card metric-card">
              <h3>Metricas del Mes</h3>
              <div className="metric-grid">
                <div className="metric-item">
                  <span>{member.memberCode ? "12" : "-"}</span>
                  <p>Asistencias</p>
                </div>
                <div className="metric-item">
                  <span>{member.memberCode ? "92%" : "-"}</span>
                  <p>Regularidad</p>
                </div>
              </div>
              <small className="metric-note">Sin datos reales por el momento.</small>
            </section>
          </div>

          <div className="member-detail-column member-detail-column--wide">
            <div className="detail-row">
              <section className="detail-card">
                <div className="card-title">
                  <span className="material-icons-outlined">person</span>
                  <h3>Informacion Personal</h3>
                </div>
                <div className="info-grid">
                  <div>
                    <p>Edad</p>
                    <strong>{age ? `${age} anos` : "-"}</strong>
                  </div>
                  <div>
                    <p>Contacto de emergencia</p>
                    <strong>{member.emergencyContactName || '-'}</strong>
                  </div>
                  <div className="info-span">
                    <p>Notas Medicas</p>
                    <strong>Ver perfil medico completo</strong>
                  </div>
                  <div className="info-span">
                    <p>ID / DNI</p>
                    <strong>{member.dni}</strong>
                  </div>
                  <div className="info-span">
                    <p>Telefono de emergencia</p>
                    <strong>{member.emergencyContactPhone || '-'}</strong>
                  </div>
                </div>
              </section>

              <section className="detail-card plan-card">
                <div className="card-title">
                  <span className="material-icons-outlined">card_membership</span>
                  <h3>Plan Activo</h3>
                </div>
                <div className="plan-info">
                  <div>
                    <p>Nombre del Plan</p>
                    <strong>{member.planName || 'Sin plan asignado'}</strong>
                  </div>
                  <div className="plan-footer">
                    <div>
                      <p>Vencimiento</p>
                      <strong>{member.membershipEndDate || '-'}</strong>
                    </div>
                    <span className="plan-badge">{membershipStatusLabel}</span>
                  </div>
                </div>
                <span className="plan-icon material-icons-outlined">fitness_center</span>
              </section>
            </div>

            <section className="detail-card">
              <div className="card-title card-title--space">
                <div className="card-title__left">
                  <span className="material-icons-outlined">history</span>
                  <h3>Ultimos Accesos</h3>
                </div>
                <button className="link-button" type="button">
                  Ver historial completo
                </button>
              </div>
              <div className="table-wrapper">
                <table className="access-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="empty-row">
                        Sin registros disponibles.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
