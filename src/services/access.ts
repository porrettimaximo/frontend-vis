import { authHeaders, requestJson } from './api';

export type AccessValidationRequest = {
  dni?: string;
  memberCode?: string;
};

export type AccessValidationResponse = {
  result: boolean | string;
  reason: string;
  memberId: number;
  memberCode: string;
  dni: string;
  memberName?: string;
  fullName?: string;
  photoUrl?: string | null;
};

export type AccessAuditResult = 'GRANTED' | 'DENIED';

export type AccessLogDto = {
  id: number;
  accessedAt: string;
  memberName?: string;
  fullName?: string;
  memberCode?: string;
  result: AccessAuditResult | boolean | string;
  reason?: string | null;
  creditsBefore?: number | null;
  creditsAfter?: number | null;
  membershipId?: number | null;
};

export async function validateAccess(payload: AccessValidationRequest): Promise<AccessValidationResponse> {
  return requestJson<AccessValidationResponse>('/access/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function listRecentAccesses(params?: {
  limit?: number;
  query?: string;
  result?: 'all' | 'allowed' | 'denied';
  reason?: string;
  from?: string;
  to?: string;
}): Promise<AccessLogDto[]> {
  const search = new URLSearchParams();
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.query) search.set('query', params.query);
  if (params?.result && params.result !== 'all') search.set('result', params.result);
  if (params?.reason && params.reason !== 'all') search.set('reason', params.reason);
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  const suffix = search.toString() ? `?${search.toString()}` : '';

  return requestJson<AccessLogDto[]>(`/access/recent${suffix}`, {
    headers: authHeaders()
  });
}
