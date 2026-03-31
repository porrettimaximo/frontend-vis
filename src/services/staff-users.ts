import { authHeaders, requestJson } from './api';

export type StaffRole = 'ADMIN' | 'RECEPCIONISTA' | 'ENTRENADOR';

export interface StaffUserDto {
  id: number;
  username: string;
  email: string;
  role: StaffRole;
  active: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string | null;
}

export interface StaffUserCreatePayload {
  username: string;
  email: string;
  password: string;
  role: StaffRole;
}

export async function listStaffUsers(): Promise<StaffUserDto[]> {
  return requestJson<StaffUserDto[]>('/staff-users', {
    headers: authHeaders()
  });
}

export async function createStaffUser(payload: StaffUserCreatePayload): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>('/staff-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function updateStaffUserRole(id: number, role: StaffRole): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/staff-users/${id}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ role })
  });
}

export async function unlockStaffUser(id: number): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/staff-users/${id}/unlock`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function activateStaffUser(id: number): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/staff-users/${id}/activate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function deactivateStaffUser(id: number): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/staff-users/${id}/deactivate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}
