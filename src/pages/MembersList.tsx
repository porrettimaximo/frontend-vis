import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentRole } from '../authz';
import { buildAssetUrl } from '../services/api';
import { deactivateMember, listMembers } from '../services/members';
import type { MemberDto } from '../services/members';
import './MembersList.css';

const membershipStatusLabels: Record<'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'DEBT', string> = {
  ACTIVE: 'Vigente',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada',
  DEBT: 'Con deuda'
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(date);
};

export default function MembersList() {
  const role = getCurrentRole();
  const canCreateMembers = role === 'ADMIN' || role === 'RECEPCIONISTA';
  const canDeactivateMembers = role === 'ADMIN' || role === 'RECEPCIONISTA';
  const [rows, setRows] = useState<MemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    listMembers({
      query: query.trim() || undefined,
      active: filter === 'all' ? undefined : filter === 'active'
    })
      .then((data) => {
        if (!mounted) return;
        setRows(data);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los socios.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [filter, query]);

  async function handleDeactivate(row: MemberDto) {
    const confirmed = window.confirm(`Dar de baja a ${row.firstName} ${row.lastName}?`);
    if (!confirmed) return;

    try {
      await deactivateMember(row.id);
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, active: false } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de baja el socio.');
    }
  }

  return (
    <div className="members-page">
      <div className="members-header">
        <h1>Gestion de Socios</h1>
        {canCreateMembers && (
          <Link className="members-primary" to="/admin/members/new">
            <span className="material-icons-round">add</span>
            Nuevo Socio
          </Link>
        )}
      </div>

      <div className="members-toolbar">
        <div className="members-filters">
          <button
            type="button"
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button
            type="button"
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Activos
          </button>
          <button
            type="button"
            className={filter === 'inactive' ? 'active' : ''}
            onClick={() => setFilter('inactive')}
          >
            Inactivos
          </button>
        </div>
        <div className="members-toolbar-actions">
          <div className="members-search">
            <span className="material-icons-round">search</span>
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="members-table-card">
        {loading && <div className="table-state">Cargando socios...</div>}
        {error && !loading && <div className="table-state error">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="table-state">No se encontraron socios con los filtros actuales.</div>
        )}
        <table className="members-table">
          <thead>
            <tr>
              <th>Socio</th>
              <th>Estado</th>
              <th>Membresia</th>
              <th>Ultima Visita</th>
              <th className="actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="member-cell">
                    <div className="member-avatar">
                      {buildAssetUrl(row.photoUrl) ? (
                        <img src={buildAssetUrl(row.photoUrl) || undefined} alt={row.firstName} />
                      ) : (
                        <span className="material-icons-round">person</span>
                      )}
                    </div>
                    <div>
                      <div className="member-name">
                        {row.firstName} {row.lastName}
                      </div>
                      <div className="member-sub">ID: #{row.memberCode || row.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status-pill ${row.active ? 'active' : 'inactive'}`}>
                    <span className="status-dot" />
                    {row.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  {row.membershipStatus ? (
                    <div className="membership-cell">
                      <strong>{row.planName || 'Plan activo'}</strong>
                      <span className={`membership-pill membership-pill--${row.membershipStatus.toLowerCase()}`}>
                        {membershipStatusLabels[row.membershipStatus]}
                      </span>
                    </div>
                  ) : (
                    <span className="muted">Sin plan</span>
                  )}
                </td>
                <td className="muted">{formatDate(row.membershipEndDate)}</td>
                <td>
                  <div className="actions">
                    <Link className="icon-button" to={`/admin/members/${row.id}`}>
                      <span className="material-icons-round">visibility</span>
                    </Link>
                    {canDeactivateMembers && (
                      <>
                        <button className="icon-button" type="button" title="Edicion completa proxima etapa" disabled>
                          <span className="material-icons-round">edit</span>
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => handleDeactivate(row)}>
                          <span className="material-icons-round">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <div className="table-info">
            Mostrando <span>{rows.length}</span> socios
          </div>
          <div className="table-pagination">
            <button type="button" disabled>
              <span className="material-icons-round">chevron_left</span>
            </button>
            <button type="button">
              <span className="material-icons-round">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
