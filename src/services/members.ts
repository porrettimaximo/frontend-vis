import { authHeaders, requestJson, requestVoid } from './api';

export interface MemberDto {
  id: number;
  memberCode: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string | null;
  email?: string | null;
  birthDate?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
  active: boolean;
  membershipId?: number | null;
  planName?: string | null;
  membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'DEBT' | null;
  membershipEndDate?: string | null;
  creditsRemaining?: number | null;
}

export type MemberPayload = {
  dni: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string | null;
  email?: string | null;
  birthDate?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
};

export async function listMembers(params?: {
  query?: string;
  active?: boolean;
}): Promise<MemberDto[]> {
  const search = new URLSearchParams();
  if (params?.query) search.set('query', params.query);
  if (typeof params?.active === 'boolean') search.set('active', String(params.active));
  const suffix = search.toString() ? `?${search.toString()}` : '';

  return requestJson<MemberDto[]>(`/members${suffix}`, {
    headers: authHeaders()
  });
}

export async function getMember(id: number): Promise<MemberDto> {
  return requestJson<MemberDto>(`/members/${id}`, {
    headers: authHeaders()
  });
}

export async function createMember(payload: MemberPayload): Promise<MemberDto> {
  return requestJson<MemberDto>('/members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function updateMember(id: number, payload: MemberPayload): Promise<MemberDto> {
  return requestJson<MemberDto>(`/members/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function deactivateMember(id: number): Promise<void> {
  return requestVoid(`/members/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
}
