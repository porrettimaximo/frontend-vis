import { authHeaders, requestJson, requestVoid } from './api';

export type EntryPolicy = 'CHARGE_ONCE_PER_DAY' | 'DENY_REPEATS_SAME_DAY' | 'CHARGE_EVERY_TIME';
export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'DEBT';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'MP' | 'CARD' | 'OTHER';

export interface PlanDto {
  id: number;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  creditLimit: number | null;
  entryPolicy: EntryPolicy;
  active: boolean;
}

export interface MembershipDto {
  id: number;
  memberId: number;
  planId: number;
  startDate: string;
  endDate: string;
  creditLimit: number | null;
  creditsRemaining: number | null;
  membershipStatus: MembershipStatus;
}

export type PlanPayload = {
  id?: number;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  creditLimit: number;
  active: boolean;
};

export type MembershipCreatePayload = {
  memberId: number;
  planId: number;
  startDate: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentNote?: string;
};

export async function listPlans(): Promise<PlanDto[]> {
  return requestJson<PlanDto[]>('/plans', {
    headers: authHeaders()
  });
}

export async function createPlan(payload: PlanPayload, entryPolicy: EntryPolicy): Promise<PlanDto> {
  return requestJson<PlanDto>(`/plans?entryPolicy=${entryPolicy}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({
      id: payload.id ?? null,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      durationDays: payload.durationDays,
      creditLimit: payload.creditLimit,
      active: payload.active
    })
  });
}

export async function deactivatePlan(id: number): Promise<void> {
  return requestVoid(`/plans/${id}/deactivate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function reactivatePlan(id: number): Promise<PlanDto> {
  return requestJson<PlanDto>(`/plans/${id}/reactivate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}

export async function listMemberships(): Promise<MembershipDto[]> {
  return requestJson<MembershipDto[]>('/memberships', {
    headers: authHeaders()
  });
}

export async function createMembership(payload: MembershipCreatePayload): Promise<MembershipDto> {
  return requestJson<MembershipDto>('/memberships', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
}

export async function deactivateMembership(id: number): Promise<void> {
  return requestVoid(`/memberships/${id}/deactivate`, {
    method: 'PUT',
    headers: authHeaders()
  });
}
