/** docs/API_CONTRACT.md §11 — MODÜLLER (İK: izin, masraf). */

import type { IsoDateString, MoneyString } from './common';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  /** Gün sayısını backend hesaplar. */
  days: number;
  note: string | null;
  status: RequestStatus;
  decidedBy: string | null;
  decidedAt: IsoDateString | null;
  createdAt: IsoDateString;
}

export interface CreateLeaveRequest {
  type: string;
  startDate: string;
  endDate: string;
  note?: string;
}

export interface ExpenseRequest {
  id: string;
  type: string;
  amount: MoneyString;
  date: string;
  receiptUrl: string | null;
  note: string | null;
  status: RequestStatus;
  decidedBy: string | null;
  decidedAt: IsoDateString | null;
  createdAt: IsoDateString;
  /** Onay ekranında talep eden bilgisi (maskesiz PII değil, ad-soyad). */
  requesterName?: string;
}

export interface CreateExpenseRequest {
  type: string;
  amount: MoneyString;
  date: string;
  receiptUrl?: string;
  note?: string;
}

export interface DecisionRequest {
  note?: string;
}
