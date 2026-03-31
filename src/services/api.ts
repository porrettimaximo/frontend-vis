export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8080';

export function authHeaders(): Record<string, string> {
  const bearer = sessionStorage.getItem('vis_auth_bearer');
  if (bearer) return { Authorization: `Bearer ${bearer}` };
  const token = sessionStorage.getItem('vis_auth_basic');
  if (!token) return {};
  return { Authorization: `Basic ${token}` };
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export function buildAssetUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

async function parseError(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    return data?.message || data?.error || `HTTP ${response.status}`;
  }

  const text = await response.text().catch(() => '');
  return text || `HTTP ${response.status}`;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('vis_auth_basic');
      sessionStorage.removeItem('vis_auth_bearer');
      sessionStorage.removeItem('vis_auth_email');
      sessionStorage.removeItem('vis_auth_role');
      sessionStorage.removeItem('vis_auth_tenant_id');
    }
    throw new ApiError(await parseError(response), response.status);
  }
  return response.json() as Promise<T>;
}

export async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetch(buildApiUrl(path), init);
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('vis_auth_basic');
      sessionStorage.removeItem('vis_auth_bearer');
      sessionStorage.removeItem('vis_auth_email');
      sessionStorage.removeItem('vis_auth_role');
      sessionStorage.removeItem('vis_auth_tenant_id');
    }
    throw new ApiError(await parseError(response), response.status);
  }
}

export async function requestBlob(
  path: string,
  init?: RequestInit
): Promise<{ blob: Blob; fileName?: string | null }> {
  const response = await fetch(buildApiUrl(path), init);
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('vis_auth_basic');
      sessionStorage.removeItem('vis_auth_bearer');
      sessionStorage.removeItem('vis_auth_email');
      sessionStorage.removeItem('vis_auth_role');
      sessionStorage.removeItem('vis_auth_tenant_id');
    }
    throw new ApiError(await parseError(response), response.status);
  }
  const disposition = response.headers.get('content-disposition');
  const fileName = disposition?.match(/filename="?(.*?)"?$/i)?.[1] ?? null;
  return { blob: await response.blob(), fileName };
}
