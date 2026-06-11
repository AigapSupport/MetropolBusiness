/** docs/API_CONTRACT.md §2 (/me/modules) + §11 — İK modül uçları. Tipler @shared/modules. */
import type { MeModulesResponse } from '@shared/me';
import type { ItemList } from '@shared/common';
import type {
  CreateExpenseRequest,
  CreateLeaveRequest,
  DecisionRequest,
  ExpenseRequest,
  LeaveRequest,
} from '@shared/modules';

import { api } from './client';

export const hrApi = {
  /** Kullanıcının segmentine göre yetkili modüller — Diğer sekmesi grid'i buradan beslenir. */
  getMyModules(): Promise<MeModulesResponse> {
    return api.get<MeModulesResponse>('/me/modules');
  },

  getLeaveRequests(): Promise<ItemList<LeaveRequest>> {
    return api.get<ItemList<LeaveRequest>>('/modules/leave-requests');
  },
  createLeaveRequest(request: CreateLeaveRequest): Promise<LeaveRequest> {
    return api.post<LeaveRequest>('/modules/leave-requests', request);
  },
  getPendingLeaveRequests(): Promise<ItemList<LeaveRequest>> {
    return api.get<ItemList<LeaveRequest>>('/modules/leave-requests/pending');
  },
  decideLeaveRequest(id: string, approve: boolean, request: DecisionRequest): Promise<LeaveRequest> {
    return api.post<LeaveRequest>(
      `/modules/leave-requests/${id}/${approve ? 'approve' : 'reject'}`,
      request,
    );
  },

  getExpenseRequests(): Promise<ItemList<ExpenseRequest>> {
    return api.get<ItemList<ExpenseRequest>>('/modules/expense-requests');
  },
  createExpenseRequest(request: CreateExpenseRequest): Promise<ExpenseRequest> {
    return api.post<ExpenseRequest>('/modules/expense-requests', request);
  },
  getPendingExpenseRequests(): Promise<ItemList<ExpenseRequest>> {
    return api.get<ItemList<ExpenseRequest>>('/modules/expense-requests/pending');
  },
  decideExpenseRequest(
    id: string,
    approve: boolean,
    request: DecisionRequest,
  ): Promise<ExpenseRequest> {
    return api.post<ExpenseRequest>(
      `/modules/expense-requests/${id}/${approve ? 'approve' : 'reject'}`,
      request,
    );
  },
};
