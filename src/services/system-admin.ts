import { authHeaders, requestJson } from './api';
import type { StaffRole, StaffUserCreatePayload, StaffUserDto } from './staff-users';

export interface SystemTenantSummaryDto {
  id: number;
  name: string;
  active: boolean;
  staffUsers: number;
  activeStaffUsers: number;
  members: number;
  activeMembers: number;
  plans: number;
  activePlans: number;
  memberships: number;
  activeMemberships: number;
  membershipsWithDebt: number;
  payments: number;
  totalRevenue: number;
  openCashRegister: boolean;
}

export interface SystemTenantDetailDto {
  summary: SystemTenantSummaryDto;
  staffUsers: StaffUserDto[];
}

export interface SystemTenantCreatePayload {
  tenantName: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
}

export async function listSystemTenants(): Promise<SystemTenantSummaryDto[]> {
  return requestJson<SystemTenantSummaryDto[]>('/system-admin/tenants', {
    headers: authHeaders()
  });
}

export async function getSystemTenant(tenantId: number): Promise<SystemTenantDetailDto> {
  return requestJson<SystemTenantDetailDto>(`/system-admin/tenants/${tenantId}`, {
    headers: authHeaders()
  });
}

export async function createSystemTenant(payload: SystemTenantCreatePayload): Promise<SystemTenantSummaryDto> {
  return requestJson<SystemTenantSummaryDto>('/system-admin/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function activateSystemTenant(tenantId: number): Promise<SystemTenantSummaryDto> {
  return requestJson<SystemTenantSummaryDto>(`/system-admin/tenants/${tenantId}/activate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function deactivateSystemTenant(tenantId: number): Promise<SystemTenantSummaryDto> {
  return requestJson<SystemTenantSummaryDto>(`/system-admin/tenants/${tenantId}/deactivate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function createSystemTenantStaffUser(
  tenantId: number,
  payload: StaffUserCreatePayload
): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/system-admin/tenants/${tenantId}/staff-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function updateSystemStaffUserRole(id: number, role: StaffRole): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/system-admin/staff-users/${id}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ role })
  });
}

export async function unlockSystemStaffUser(id: number): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/system-admin/staff-users/${id}/unlock`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function activateSystemStaffUser(id: number): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/system-admin/staff-users/${id}/activate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function deactivateSystemStaffUser(id: number): Promise<StaffUserDto> {
  return requestJson<StaffUserDto>(`/system-admin/staff-users/${id}/deactivate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}
