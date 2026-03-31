import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';
import { listRecentAccesses, validateAccess } from '../services/access';
import './AccessControl.css';

type RuleStatus = 'ok' | 'fail' | 'na';

type RuleCheck = {
  label: string;
  status: RuleStatus;
  detail: string;
};

type AccessResult = {
  allowed: boolean;
  member: {
    id: number;
    dni: string;
    memberCode: string;
    name: string;
    photoUrl?: string | null;
  } | null;
  reason: string;
  rules: RuleCheck[];
};

type AccessLogEntry = {
  id: number;
  name: string;
  code: string;
  time: string;
  status: 'allowed' | 'denied';
  reason?: string;
};

const ACCESS_LOG_POLL_MS = 5000;

const FALLBACK_RULES: RuleCheck[] = [
  { label: 'Vigencia', status: 'fail', detail: 'Sin datos' },
  { label: 'Creditos', status: 'na', detail: 'Sin datos' },
  { label: 'Deuda', status: 'na', detail: 'Sin datos' }
];

const normalizeInput = (value: string) => value.replace(/\s+/g, '').trim();

const normalizeReason = (reason: string) => reason.trim().toUpperCase();

const reasonLabel = (reason: string) => {
  const normalized = normalizeReason(reason);
  if (['DEBT', 'DEUDA', 'PENDING_DEBT', 'DEUDA_PENDIENTE'].includes(normalized)) return 'Deuda pendiente';
  if (['EXPIRED', 'VENCIDO', 'VENCIDA', 'MEMBERSHIP_EXPIRED', 'MEMBRESIA_NO_VIGENTE'].includes(normalized)) {
    return 'Membresia vencida';
  }
  if (['NO_CREDITS', 'SIN_CREDITOS', 'CREDITS_EMPTY'].includes(normalized)) {
    return 'Sin creditos disponibles';
  }
  if (['NOT_FOUND', 'MEMBER_NOT_FOUND'].includes(normalized)) return 'Socio no encontrado';
  if (['SOCIO_INACTIVO', 'INACTIVE_MEMBER'].includes(normalized)) return 'Socio inactivo';
  if (['ALREADY_GRANTED_TODAY', 'ALREADY_USED_TODAY'].includes(normalized)) return 'Ya ingreso hoy';
  return reason || 'Acceso denegado';
};

const buildRulesFromReason = (reason: string): RuleCheck[] => {
  const normalized = normalizeReason(reason);
  if (['DEBT', 'DEUDA', 'PENDING_DEBT', 'DEUDA_PENDIENTE'].includes(normalized)) {
    return [
      { label: 'Vigencia', status: 'na', detail: 'Sin datos' },
      { label: 'Creditos', status: 'na', detail: 'Sin datos' },
      { label: 'Deuda', status: 'fail', detail: 'Deuda pendiente' }
    ];
  }
  if (['EXPIRED', 'VENCIDO', 'VENCIDA', 'MEMBERSHIP_EXPIRED', 'MEMBRESIA_NO_VIGENTE'].includes(normalized)) {
    return [
      { label: 'Vigencia', status: 'fail', detail: 'Membresia vencida' },
      { label: 'Creditos', status: 'na', detail: 'Sin datos' },
      { label: 'Deuda', status: 'na', detail: 'Sin datos' }
    ];
  }
  if (['NO_CREDITS', 'SIN_CREDITOS', 'CREDITS_EMPTY'].includes(normalized)) {
    return [
      { label: 'Vigencia', status: 'na', detail: 'Sin datos' },
      { label: 'Creditos', status: 'fail', detail: 'Sin creditos disponibles' },
      { label: 'Deuda', status: 'na', detail: 'Sin datos' }
    ];
  }
  if (['NOT_FOUND', 'MEMBER_NOT_FOUND'].includes(normalized)) {
    return FALLBACK_RULES;
  }
  if (['SOCIO_INACTIVO', 'INACTIVE_MEMBER'].includes(normalized)) {
    return [
      { label: 'Vigencia', status: 'na', detail: 'Sin datos' },
      { label: 'Creditos', status: 'na', detail: 'Sin datos' },
      { label: 'Estado', status: 'fail', detail: 'Socio inactivo' }
    ];
  }
  return FALLBACK_RULES;
};

const isAllowedResult = (result: boolean | string) => {
  if (typeof result === 'boolean') return result;
  const normalized = result.trim().toUpperCase();
  return ['ALLOWED', 'PERMITIDO', 'OK', 'SUCCESS', 'GRANTED'].includes(normalized);
};

const mapAccessLogEntry = (entry: {
  id: number;
  memberName?: string;
  fullName?: string;
  memberCode?: string;
  accessedAt: string;
  result: boolean | string;
  reason?: string | null;
}): AccessLogEntry => {
  const allowed = isAllowedResult(entry.result);
  const reason = entry.reason ? reasonLabel(entry.reason) : undefined;
  const accessDate = new Date(entry.accessedAt);
  const displayName = entry.memberName || entry.fullName || 'Socio sin nombre';
  const displayCode = entry.memberCode || '-';
  return {
    id: entry.id,
    name: displayName,
    code: displayCode,
    time: Number.isNaN(accessDate.getTime())
      ? entry.accessedAt
      : accessDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    status: allowed ? 'allowed' : 'denied',
    reason: allowed ? undefined : reason
  };
};

const playTone = (type: 'ok' | 'error') => {
  try {
    const AudioContextClass: typeof window.AudioContext | undefined =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof window.AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = type === 'ok' ? 740 : 220;
    gain.gain.value = 0.08;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + (type === 'ok' ? 0.15 : 0.3));

    setTimeout(() => {
      context.close();
    }, 400);
  } catch (error) {
    // ignore audio errors
  }
};

export default function AccessControl() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AccessResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [accessLog, setAccessLog] = useState<AccessLogEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingLogRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      // ignore fullscreen errors
    }
  };

  useEffect(() => {
    if (!result) return;
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => {
      setResult(null);
    }, 5000);
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [result]);

  useEffect(() => {
    const loadLog = async () => {
      if (loadingLogRef.current) return;
      loadingLogRef.current = true;
      try {
        const data = await listRecentAccesses({ limit: 8 });
        setAccessLog(data.map(mapAccessLogEntry));
      } catch (err) {
        // keep last known state
      } finally {
        loadingLogRef.current = false;
      }
    };

    loadLog();
    pollRef.current = setInterval(loadLog, ACCESS_LOG_POLL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeInput(query);

    if (!normalized) {
      setError('Ingrese un DNI o codigo.');
      setResult(null);
      return;
    }

      setError('');
      setLoading(true);
    try {
      const isDni = /^\d+$/.test(normalized);
      const payload =
        isDni
          ? { dni: normalized }
          : { memberCode: normalized.toUpperCase() };
      const response = await validateAccess(payload);
      const allowed = isAllowedResult(response.result);
      const reason = allowed ? '' : reasonLabel(response.reason);
      const okRules: RuleCheck[] = [
        { label: 'Vigencia', status: 'ok', detail: 'Vigente' },
        { label: 'Creditos', status: 'ok', detail: 'Con creditos' },
        { label: 'Deuda', status: 'ok', detail: 'Sin deuda' }
      ];

      const nextResult: AccessResult = {
        allowed,
        member: {
          id: response.memberId,
          dni: response.dni,
          memberCode: response.memberCode,
          name: response.memberName || response.fullName || 'Socio sin nombre',
          photoUrl: response.photoUrl || null
        },
        reason,
        rules: allowed ? okRules : buildRulesFromReason(response.reason)
      };

      setResult(nextResult);
      setAccessLog((prev) => [
        {
          id: Date.now(),
          name: response.memberName || response.fullName || 'Socio sin nombre',
          code: response.memberCode,
          time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          status: allowed ? ('allowed' as const) : ('denied' as const),
          reason: allowed ? undefined : reason
        },
        ...prev
      ].slice(0, 8));

      if (soundEnabled) {
        playTone(allowed ? 'ok' : 'error');
      }
      setQuery('');
      inputRef.current?.focus();
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'No se pudo validar el acceso.';
      const status = err instanceof ApiError ? err.status : null;
      const normalizedMessage = normalizeReason(message);

      const mappedReason =
        status === 404 || normalizedMessage.includes('MEMBER NOT FOUND')
          ? 'Socio no encontrado'
          : status === 400
            ? 'Entrada invalida'
            : status === 409
              ? 'Conflicto al validar acceso'
              : 'Error interno del backend';

      setError(message);
      const nextResult: AccessResult = {
        allowed: false,
        member: null,
        reason: mappedReason,
        rules:
          mappedReason === 'Socio no encontrado'
            ? FALLBACK_RULES
            : [
                { label: 'Backend', status: 'fail', detail: mappedReason },
                { label: 'Vigencia', status: 'na', detail: 'No evaluada' },
                { label: 'Creditos', status: 'na', detail: 'No evaluados' }
              ]
      };
      setResult(nextResult);
      if (soundEnabled) {
        playTone('error');
      }
      setQuery('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const status = loading ? 'loading' : result ? (result.allowed ? 'allowed' : 'denied') : 'idle';
  const statusTitle = result
    ? result.allowed
      ? 'Acceso permitido'
      : 'Acceso denegado'
    : loading
      ? 'Validando...'
      : 'Esperando validacion';

  const statusSubtitle = result
    ? result.allowed
      ? 'Puede ingresar al establecimiento.'
      : 'Se requiere intervencion del administrador.'
    : loading
      ? 'Procesando solicitud de acceso.'
      : 'Ingrese DNI o codigo y presione Validar.';

  const memberName = result?.member
    ? result.member.name
    : 'Sin datos del socio';

  const memberCode = result?.member ? result.member.memberCode : '-';
  const rules = result?.rules ?? FALLBACK_RULES;

  return (
    <div className="access-control-page">
      <div className="access-control-header">
        <div>
          <h1>Control de Accesos</h1>
          <p>Validacion rapida por DNI o codigo con motivo obligatorio en denegados.</p>
        </div>
        <div className="access-control-meta">
          <button className="fullscreen-button" type="button" onClick={handleToggleFullscreen}>
            <span className="material-icons-round">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
            {isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
          </button>
          <label className="sound-toggle">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            Sonido OK/Error
          </label>
        </div>
      </div>

      <div className="access-control-grid">
        <div className="access-main">
          <section className="access-card access-card--input">
            <form className="access-control-form" onSubmit={handleSubmit}>
              <label htmlFor="access-input">DNI o Codigo</label>
              <div className="access-control-input-row">
                <input
                  id="access-input"
                  ref={inputRef}
                  className="access-control-input"
                  type="text"
                  placeholder="Ingrese DNI o codigo"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                />
                <button className="validate-button" type="submit" disabled={loading}>
                  <span className="material-icons-round">task_alt</span>
                  {loading ? 'Validando...' : 'Validar'}
                </button>
              </div>
              <div className="access-control-hint">
                Enter para validar. Ejemplos: <strong>30123456</strong>, <strong>A-102</strong>,{' '}
                <strong>B-778</strong>.
              </div>
              {error && <div className="access-control-error">{error}</div>}
            </form>

            <div className="access-control-notes">
              <div className="note-row">
                <span className="material-icons-round">rule</span>
                Verifica vigencia, creditos y deuda antes de permitir el acceso.
              </div>
              <div className="note-row">
                <span className="material-icons-round">info</span>
                En caso de denegado, el motivo se muestra siempre.
              </div>
            </div>
          </section>

          <section className={`access-card access-result ${status}`} aria-live="polite">
            <div className="result-header">
              <span className="semaphore-dot" />
              <div>
                <div className="result-title">{statusTitle}</div>
                <div className="result-subtitle">{statusSubtitle}</div>
              </div>
            </div>

            <div className="member-summary">
              <div className="member-photo">
                {result?.member?.photoUrl ? (
                  <img src={result.member.photoUrl} alt={memberName} />
                ) : (
                  <span className="material-icons-round">person</span>
                )}
              </div>
              <div className="member-info">
                <div className="member-name">{memberName}</div>
                <div className="member-code">Codigo: {memberCode}</div>
                {!result?.allowed && result?.reason && (
                  <div className="member-reason">Motivo: {result.reason}</div>
                )}
              </div>
            </div>

            <div className="rules-list">
              {rules.map((rule) => (
                <div key={rule.label} className={`rule-card ${rule.status}`}>
                  <div className="rule-title">{rule.label}</div>
                  <div className="rule-detail">{rule.detail}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="access-card access-log">
        <div className="access-log-header">
          <h2>Ultimos accesos</h2>
          <span className="access-log-count">{accessLog.length} registros</span>
        </div>
        <div className="access-log-list">
          {accessLog.length === 0 && (
            <div className="access-log-empty">Sin accesos recientes.</div>
          )}
          {accessLog.map((entry) => (
            <div key={entry.id} className={`access-log-row ${entry.status}`}>
              <div className="access-log-left">
                <span className="access-log-avatar">{(entry.name || '?').charAt(0).toUpperCase()}</span>
                <div>
                  <div className="access-log-name">{entry.name || 'Socio sin nombre'}</div>
                  <div className="access-log-code">Codigo {entry.code}</div>
                </div>
              </div>
              <div className="access-log-right">
                <div className="access-log-time">{entry.time}</div>
                <div className="access-log-status">
                  {entry.status === 'allowed' ? 'Permitido' : 'Denegado'}
                  {entry.status === 'denied' && entry.reason && (
                    <span className="access-log-reason">{entry.reason}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
