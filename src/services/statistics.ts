import { authHeaders, requestJson } from './api';

export interface AccessBucketDto {
  bucket: string;
  total: number;
}

export interface AccessStatsResponse {
  from: string;
  to: string;
  granularity: 'day' | 'hour';
  hourFrom?: number | null;
  hourTo?: number | null;
  series: AccessBucketDto[];
  peak?: AccessBucketDto | null;
}

export interface PaymentStatDto {
  date?: string | null;
  label?: string | null;
  amount: number;
  count: number;
}

export interface PaymentReportResponse {
  revenueOverTime: PaymentStatDto[];
  revenueByMethod: PaymentStatDto[];
  topPayingMembers: PaymentStatDto[];
}

export async function getAccessStatistics(params: {
  from: string;
  to: string;
  granularity: 'day' | 'hour';
  hourFrom?: number;
  hourTo?: number;
  includePeak?: boolean;
}): Promise<AccessStatsResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    granularity: params.granularity,
    includePeak: String(params.includePeak ?? true)
  });

  if (typeof params.hourFrom === 'number' && typeof params.hourTo === 'number') {
    search.set('hourFrom', String(params.hourFrom));
    search.set('hourTo', String(params.hourTo));
  }

  return requestJson<AccessStatsResponse>(`/statistics/accesses?${search.toString()}`, {
    headers: authHeaders()
  });
}

export async function getFinancialStatistics(params: {
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
}): Promise<PaymentReportResponse> {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    granularity: params.granularity
  });

  return requestJson<PaymentReportResponse>(`/statistics/financials?${search.toString()}`, {
    headers: authHeaders()
  });
}
