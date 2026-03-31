import { authHeaders, requestBlob, requestJson, requestVoid } from './api';

export type MedicalStatus = 'OK' | 'REQUIERE_ATENCION' | 'RESTRINGIDO';
export type MedicalDocumentType = 'APTO_MEDICO' | 'DIAGNOSTICO' | 'OTRO';

export interface MedicalObservationDto {
  id: number;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface MedicalDocumentDto {
  id: number;
  documentType: MedicalDocumentType;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MedicalProfileDto {
  memberId: number;
  hasMedicalAlert: boolean;
  medicalStatus: MedicalStatus;
  observations: MedicalObservationDto[];
  documents: MedicalDocumentDto[];
}

export async function getMedicalProfile(memberId: number): Promise<MedicalProfileDto> {
  return requestJson<MedicalProfileDto>(`/members/${memberId}/medical`, {
    headers: authHeaders()
  });
}

export async function listMedicalObservations(memberId: number): Promise<MedicalObservationDto[]> {
  return requestJson<MedicalObservationDto[]>(`/members/${memberId}/medical/observations`, {
    headers: authHeaders()
  });
}

export async function createMedicalObservation(
  memberId: number,
  payload: { text: string }
): Promise<MedicalObservationDto> {
  return requestJson<MedicalObservationDto>(`/members/${memberId}/medical/observations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function listMedicalDocuments(memberId: number): Promise<MedicalDocumentDto[]> {
  return requestJson<MedicalDocumentDto[]>(`/members/${memberId}/medical/documents`, {
    headers: authHeaders()
  });
}

export async function uploadMedicalDocument(
  memberId: number,
  payload: { type: MedicalDocumentType; file: File }
): Promise<MedicalDocumentDto> {
  const formData = new FormData();
  formData.append('type', payload.type);
  formData.append('file', payload.file);

  return requestJson<MedicalDocumentDto>(`/members/${memberId}/medical/documents`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });
}

export async function deleteMedicalDocument(memberId: number, documentId: number): Promise<void> {
  return requestVoid(`/members/${memberId}/medical/documents/${documentId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
}

export async function downloadMedicalDocument(memberId: number, documentId: number) {
  return requestBlob(`/members/${memberId}/medical/documents/${documentId}/download`, {
    headers: authHeaders()
  });
}
