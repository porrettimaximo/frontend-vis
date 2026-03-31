import { authHeaders, requestJson } from './api';
import type { PaymentMethod } from './plans';

export interface PaymentDto {
  memberId: number;
  membershipId: number;
  paymentMethod: PaymentMethod;
  amount: number;
  paidAt: string;
  note?: string | null;
  receiptId?: number | null;
}

export type PaymentPayload = {
  memberId: number;
  membershipId: number;
  paymentMethod: PaymentMethod;
  amount: number;
  paidAt?: string;
  note?: string;
};

export async function listPayments(): Promise<PaymentDto[]> {
  return requestJson<PaymentDto[]>('/payments', {
    headers: authHeaders()
  });
}

export async function createPayment(payload: PaymentPayload): Promise<PaymentDto> {
  return requestJson<PaymentDto>('/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({
      memberId: payload.memberId,
      membershipId: payload.membershipId,
      paymentMethod: payload.paymentMethod,
      amount: payload.amount,
      paidAt: payload.paidAt || new Date().toISOString().slice(0, 10),
      note: payload.note || null,
      receiptId: null
    })
  });
}
