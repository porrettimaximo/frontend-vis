import { API_BASE_URL, authHeaders, requestBlob, requestJson } from './api';
import type { PaymentMethod } from './plans';

export type CashRegisterStatus = 'OPEN' | 'CLOSED';

export interface CashRegisterDto {
  id: number;
  businessDate: string;
  status: CashRegisterStatus;
  openingBalance: number;
  openedAt: string;
  closedAt?: string | null;
  expectedTotal?: number | null;
  countedTotal?: number | null;
  difference?: number | null;
  openedBy?: string | null;
  closedBy?: string | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: string | null;
}

export interface CashRegisterCloseResponse {
  register: CashRegisterDto;
  expectedByMethod: Record<PaymentMethod, number>;
  countedByMethod: Record<PaymentMethod, number>;
  paymentCount: number;
}

export async function getOpenCashRegister(): Promise<CashRegisterDto | null> {
  const response = await fetch(`${API_BASE_URL}/cash-registers/open`, {
    headers: authHeaders()
  });
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as CashRegisterDto;
}

export async function openCashRegister(openingBalance: number): Promise<CashRegisterDto> {
  return requestJson<CashRegisterDto>('/cash-registers/open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ openingBalance })
  });
}

export async function closeCashRegister(
  id: number,
  countedByMethod: Record<PaymentMethod, number>
): Promise<CashRegisterCloseResponse> {
  return requestJson<CashRegisterCloseResponse>(`/cash-registers/${id}/close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ countedByMethod })
  });
}

export async function downloadCashRegisterReport(id: number) {
  return requestBlob(`/cash-registers/${id}/report`, {
    headers: authHeaders()
  });
}
