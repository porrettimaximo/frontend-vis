import { buildApiUrl } from './api';

export interface LoginResponse {
  success: boolean;
  message?: string;
  staffId?: number;
  email?: string;
  role?: string;
  tenantId?: number;
  principal?: string;
}

export interface TenantOption {
  id: number;
  name: string;
}

export interface RegisterPayload {
  tenantName: string;
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  tenantId?: number;
  staffId?: number;
  email?: string;
  details?: Record<string, string>;
}

export async function listTenants(): Promise<TenantOption[]> {
  const response = await fetch(buildApiUrl('/api/tenants'));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as TenantOption[];
}

export async function login(email: string, password: string, tenantId?: number) {
  try {
    const response = await fetch(buildApiUrl('/api/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId: tenantId ?? null })
    });

    const data = (await response.json().catch(() => null)) as LoginResponse | null;
    if (response.ok && data?.success) {
      const principal = data.principal || email;
      const token = btoa(`${principal}:${password}`);
      sessionStorage.setItem('vis_auth_basic', token);
      sessionStorage.setItem('vis_auth_email', data.email || email);
      sessionStorage.setItem('vis_auth_role', data.role || 'STAFF');
      if (typeof data.tenantId === 'number') {
        sessionStorage.setItem('vis_auth_tenant_id', String(data.tenantId));
      } else {
        sessionStorage.removeItem('vis_auth_tenant_id');
      }
      return data;
    }

    return {
      success: false,
      message: data?.message || `HTTP ${response.status}`
    };
  } catch {
    return {
      success: false,
      message: 'No se pudo conectar al backend.'
    };
  }
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  try {
    const response = await fetch(buildApiUrl('/api/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => null)) as
      | (RegisterResponse & { error?: string; details?: Record<string, string> })
      | null;

    if (response.ok) {
      return data ?? { success: true };
    }

    return {
      success: false,
      message:
        (data?.details ? Object.values(data.details)[0] : undefined) ||
        data?.message ||
        `HTTP ${response.status}`
      ,
      details: data?.details
    };
  } catch {
    return {
      success: false,
      message: 'No se pudo conectar al backend.'
    };
  }
}

export function logout() {
  sessionStorage.removeItem('vis_auth_basic');
  sessionStorage.removeItem('vis_auth_bearer');
  sessionStorage.removeItem('vis_auth_email');
  sessionStorage.removeItem('vis_auth_role');
  sessionStorage.removeItem('vis_auth_tenant_id');
}
