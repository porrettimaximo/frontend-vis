import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMember } from '../services/members';
import './MemberCreate.css';

export default function MemberCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    birthDate: '',
    email: '',
    phone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await createMember({ ...form, photoUrl: null });
      navigate(`/admin/members/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el socio.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="member-create">
      <div className="page-header">
        <h1>Crear Nuevo Socio</h1>
        <p>Complete la informacion para dar de alta a un nuevo integrante.</p>
      </div>

      <form className="form-layout" onSubmit={handleSubmit}>
        <section className="card">
          <div className="card-title">
            <span className="material-icons-round">person</span>
            <h2>Datos Personales</h2>
          </div>
          <div className="grid-12">
            <div className="photo-col">
              <input className="file-input" type="file" accept="image/*" onChange={onPhotoSelected} />
              <div className="photo-upload">
                {photoPreview ? <img src={photoPreview} alt="Foto" /> : (
                  <>
                    <span className="material-icons-round">add_a_photo</span>
                    <span className="upload-text">Subir Foto</span>
                  </>
                )}
              </div>
              <p className="photo-hint">
                {photoFile
                  ? 'La foto queda en preview local por ahora. La carga real de imagen se conectara en una etapa posterior.'
                  : 'Formatos: JPG, PNG. Preview local disponible.'}
              </p>
            </div>
            <div className="fields-col">
              <div className="field">
                <label>Nombre</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} />
              </div>
              <div className="field">
                <label>Apellido</label>
                <input name="lastName" value={form.lastName} onChange={handleChange} />
              </div>
              <div className="field">
                <label>ID / DNI</label>
                <input name="dni" value={form.dni} onChange={handleChange} />
              </div>
              <div className="field">
                <label>Fecha de Nacimiento</label>
                <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
              </div>
              <div className="field">
                <label>Email</label>
                <input name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="field">
                <label>Telefono</label>
                <input name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="field span-2">
                <label>Direccion</label>
                <input name="address" value={form.address} onChange={handleChange} />
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-title">
            <span className="material-icons-round">contact_phone</span>
            <h2>Contacto de Emergencia</h2>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Nombre del Contacto</label>
              <input name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Telefono del Contacto</label>
              <input name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={handleChange} />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={() => navigate('/admin/members')}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar Socio'}
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}
      </form>
    </div>
  );
}
