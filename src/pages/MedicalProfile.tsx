import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { buildAssetUrl } from '../services/api';
import type { MemberDto } from '../services/members';
import { getMember } from '../services/members';
import {
  createMedicalObservation,
  deleteMedicalDocument,
  downloadMedicalDocument,
  getMedicalProfile,
  listMedicalDocuments,
  listMedicalObservations,
  uploadMedicalDocument
} from '../services/medical';
import type {
  MedicalDocumentDto,
  MedicalDocumentType,
  MedicalObservationDto,
  MedicalProfileDto
} from '../services/medical';
import './MedicalProfile.css';

const documentTypeOptions: Array<{ value: MedicalDocumentType; label: string }> = [
  { value: 'APTO_MEDICO', label: 'Apto medico' },
  { value: 'DIAGNOSTICO', label: 'Diagnostico' },
  { value: 'OTRO', label: 'Otro' }
];

const statusLabel: Record<MedicalProfileDto['medicalStatus'], string> = {
  OK: 'Sin alertas',
  REQUIERE_ATENCION: 'Requiere atencion',
  RESTRINGIDO: 'Restringido'
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined
  }).format(date);
};

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MedicalProfile() {
  const { id } = useParams();
  const memberId = Number(id);

  const [member, setMember] = useState<MemberDto | null>(null);
  const [profile, setProfile] = useState<MedicalProfileDto | null>(null);
  const [observations, setObservations] = useState<MedicalObservationDto[]>([]);
  const [documents, setDocuments] = useState<MedicalDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [observationText, setObservationText] = useState('');
  const [documentType, setDocumentType] = useState<MedicalDocumentType>('APTO_MEDICO');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [savingObservation, setSavingObservation] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!memberId || Number.isNaN(memberId)) {
      setError('ID de socio invalido.');
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([
      getMember(memberId),
      getMedicalProfile(memberId),
      listMedicalObservations(memberId),
      listMedicalDocuments(memberId)
    ])
      .then(([memberData, profileData, observationsData, documentsData]) => {
        if (!mounted) return;
        setMember(memberData);
        setProfile(profileData);
        setObservations(observationsData);
        setDocuments(documentsData);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil medico.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [memberId]);

  const memberPhoto = buildAssetUrl(member?.photoUrl);

  const alertMessage = useMemo(() => {
    if (!profile) return 'Sin datos medicos cargados.';
    if (profile.medicalStatus === 'RESTRINGIDO') return 'Socio con restriccion activa. Revisar documentacion antes de habilitar actividades.';
    if (profile.medicalStatus === 'REQUIERE_ATENCION') return 'Se recomienda revision del perfil medico y verificacion del ultimo apto.';
    return 'Sin alertas medicas activas al momento.';
  }, [profile]);

  async function refreshMedicalData() {
    const [profileData, observationsData, documentsData] = await Promise.all([
      getMedicalProfile(memberId),
      listMedicalObservations(memberId),
      listMedicalDocuments(memberId)
    ]);
    setProfile(profileData);
    setObservations(observationsData);
    setDocuments(documentsData);
  }

  async function handleObservationSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!observationText.trim()) {
      setError('La observacion no puede estar vacia.');
      return;
    }

    setSavingObservation(true);
    setError('');
    setFeedback('');
    try {
      const created = await createMedicalObservation(memberId, { text: observationText.trim() });
      setObservations((prev) => [created, ...prev]);
      setObservationText('');
      setFeedback('Observacion agregada correctamente.');
      const profileData = await getMedicalProfile(memberId);
      setProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la observacion.');
    } finally {
      setSavingObservation(false);
    }
  }

  async function handleDocumentUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!documentFile) {
      setError('Selecciona un archivo para adjuntar.');
      return;
    }

    setUploadingDocument(true);
    setError('');
    setFeedback('');
    try {
      const created = await uploadMedicalDocument(memberId, {
        type: documentType,
        file: documentFile
      });
      setDocuments((prev) => [created, ...prev]);
      setDocumentFile(null);
      setFeedback('Documento subido correctamente.');
      await refreshMedicalData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento.');
    } finally {
      setUploadingDocument(false);
    }
  }

  async function handleDeleteDocument(document: MedicalDocumentDto) {
    const confirmed = window.confirm(`Eliminar logicamente ${document.originalFileName}?`);
    if (!confirmed) return;

    setDeletingDocumentId(document.id);
    setError('');
    setFeedback('');
    try {
      await deleteMedicalDocument(memberId, document.id);
      setDocuments((prev) => prev.filter((item) => item.id !== document.id));
      setFeedback('Documento eliminado correctamente.');
      await refreshMedicalData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento.');
    } finally {
      setDeletingDocumentId(null);
    }
  }

  async function handleDownloadDocument(document: MedicalDocumentDto) {
    setDownloadingDocumentId(document.id);
    setError('');
    try {
      const { blob, fileName } = await downloadMedicalDocument(memberId, document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || document.originalFileName;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el documento.');
    } finally {
      setDownloadingDocumentId(null);
    }
  }

  return (
    <div className="console-page">
      <div className="console-header">
        <div>
          <h1>Perfil Medico del Socio</h1>
          <p>
            {member ? `${member.firstName} ${member.lastName}` : `Socio #${id}`}. Historial de observaciones,
            documentacion y alertas operativas.
          </p>
        </div>
        <div className="console-actions">
          <Link className="console-secondary" to={`/admin/members/${id}`}>
            <span className="material-icons-round">arrow_back</span>
            Volver al socio
          </Link>
        </div>
      </div>

      {loading && <div className="console-note">Cargando perfil medico...</div>}
      {!loading && error && <div className="medical-feedback medical-feedback--error">{error}</div>}
      {!loading && feedback && <div className="medical-feedback medical-feedback--success">{feedback}</div>}

      {!loading && !error && profile && member && (
        <>
          <div className="console-grid console-grid--two">
            <section className="console-card console-stack">
              <div className="console-card-header">
                <div>
                  <h2>Estado medico</h2>
                  <p>Indicadores reales para recepcion y staff autorizado.</p>
                </div>
                <span className={`console-badge ${profile.hasMedicalAlert ? 'warning' : 'success'}`}>
                  {statusLabel[profile.medicalStatus]}
                </span>
              </div>

              <div className="medical-member">
                <div className="medical-member__photo">
                  {memberPhoto ? <img src={memberPhoto} alt={member.firstName} /> : <span className="material-icons-round">person</span>}
                </div>
                <div>
                  <strong>{member.firstName} {member.lastName}</strong>
                  <small>DNI {member.dni} · Codigo {member.memberCode}</small>
                </div>
              </div>

              <div className={`medical-alert ${profile.hasMedicalAlert ? 'is-alert' : 'is-ok'}`}>
                <span className="material-icons-round">health_and_safety</span>
                <div>
                  <strong>{statusLabel[profile.medicalStatus]}</strong>
                  <p>{alertMessage}</p>
                </div>
              </div>

              <div className="console-stat-grid">
                <div className="console-stat-box">
                  <span>Observaciones</span>
                  <strong>{observations.length}</strong>
                </div>
                <div className="console-stat-box">
                  <span>Documentos</span>
                  <strong>{documents.length}</strong>
                </div>
              </div>
            </section>

            <section className="console-card medical-form-card">
              <div className="console-card-header">
                <div>
                  <h2>Nueva observacion</h2>
                  <p>Se guarda con autor y timestamp usando el backend actual.</p>
                </div>
              </div>
              <form className="console-stack" onSubmit={handleObservationSubmit}>
                <div className="console-field">
                  <label htmlFor="medical-note">Observacion</label>
                  <textarea
                    id="medical-note"
                    value={observationText}
                    onChange={(event) => setObservationText(event.target.value)}
                    placeholder="Ej. Se presenta apto medico actualizado."
                  />
                </div>
                <div className="medical-form-actions">
                  <button className="console-primary" type="submit" disabled={savingObservation}>
                    {savingObservation ? 'Guardando...' : 'Guardar observacion'}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <div className="console-grid console-grid--wide">
            <section className="console-card">
              <div className="console-card-header">
                <div>
                  <h2>Historial de observaciones</h2>
                  <p>Entradas ordenadas por fecha con autor real.</p>
                </div>
              </div>
              {observations.length === 0 ? (
                <div className="console-note">Todavia no hay observaciones medicas cargadas.</div>
              ) : (
                <div className="console-list">
                  {observations.map((observation) => (
                    <div className="console-list-item" key={observation.id}>
                      <div>
                        <strong>{observation.text}</strong>
                        <small>{observation.createdBy || 'Sistema'}</small>
                      </div>
                      <span>{formatDate(observation.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="console-card">
              <div className="console-card-header">
                <div>
                  <h2>Documentacion adjunta</h2>
                  <p>Subida, descarga y baja logica de documentos medicos.</p>
                </div>
              </div>

              <form className="medical-upload" onSubmit={handleDocumentUpload}>
                <div className="console-field">
                  <label htmlFor="medical-doc-type">Tipo de documento</label>
                  <select
                    id="medical-doc-type"
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value as MedicalDocumentType)}
                  >
                    {documentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="console-field">
                  <label htmlFor="medical-doc-file">Archivo</label>
                  <input
                    id="medical-doc-file"
                    type="file"
                    onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                  />
                </div>
                <button className="console-primary" type="submit" disabled={uploadingDocument}>
                  {uploadingDocument ? 'Subiendo...' : 'Subir documento'}
                </button>
              </form>

              {documents.length === 0 ? (
                <div className="console-note">No hay documentos adjuntos para este socio.</div>
              ) : (
                <div className="console-list">
                  {documents.map((document) => (
                    <div className="console-list-item medical-document-item" key={document.id}>
                      <div>
                        <strong>{document.originalFileName}</strong>
                        <small>
                          {document.documentType} · {formatBytes(document.sizeBytes)} · {document.uploadedBy || 'Sistema'}
                        </small>
                      </div>
                      <div className="medical-document-actions">
                        <span>{formatDate(document.uploadedAt)}</span>
                        <button
                          type="button"
                          className="console-secondary"
                          onClick={() => handleDownloadDocument(document)}
                          disabled={downloadingDocumentId === document.id}
                        >
                          {downloadingDocumentId === document.id ? 'Descargando...' : 'Descargar'}
                        </button>
                        <button
                          type="button"
                          className="console-secondary medical-delete"
                          onClick={() => handleDeleteDocument(document)}
                          disabled={deletingDocumentId === document.id}
                        >
                          {deletingDocumentId === document.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
