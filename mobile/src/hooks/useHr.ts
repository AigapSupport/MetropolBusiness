/** İK modülleri React Query hook'ları (PRD §10). Yetki backend'de doğrulanır (403 NOT_AUTHORIZED_MODULE). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { hrApi } from '@/api/hr';
import type { CreateExpenseRequest, CreateLeaveRequest, DecisionRequest } from '@shared/modules';

export function useMyModules() {
  return useQuery({
    queryKey: ['me', 'modules'],
    queryFn: () => hrApi.getMyModules(),
  });
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: ['hr', 'leave'],
    queryFn: () => hrApi.getLeaveRequests(),
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateLeaveRequest) => hrApi.createLeaveRequest(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] }),
  });
}

export function useExpenseRequests() {
  return useQuery({
    queryKey: ['hr', 'expense'],
    queryFn: () => hrApi.getExpenseRequests(),
  });
}

export function useCreateExpenseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateExpenseRequest) => hrApi.createExpenseRequest(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'expense'] }),
  });
}

/** Onay ekranı — yalnız expense_approval modülü olanlara açılır (rozet sayısı da buradan). */
export function usePendingApprovals(enabled: boolean) {
  const expenses = useQuery({
    queryKey: ['hr', 'pending', 'expense'],
    queryFn: () => hrApi.getPendingExpenseRequests(),
    enabled,
  });
  const leaves = useQuery({
    queryKey: ['hr', 'pending', 'leave'],
    queryFn: () => hrApi.getPendingLeaveRequests(),
    enabled,
  });
  return { expenses, leaves };
}

export function useDecideExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      hrApi.decideExpenseRequest(id, approve, { note } satisfies DecisionRequest),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'pending'] }),
  });
}

export function useDecideLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      hrApi.decideLeaveRequest(id, approve, { note } satisfies DecisionRequest),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'pending'] }),
  });
}
