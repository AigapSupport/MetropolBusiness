/** Keşfet (PRD §8.5) — üye işyeri listesi + geri bildirim hook'ları. */
import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { MerchantFeedbackRequest, MerchantListResponse } from '@shared/metropol';

/** Sektör: 0=Restoran/Market, 1=Giyim, 2=Hepsi (API_CONTRACT §9). */
export function useMerchants(sectorId: number) {
  return useQuery({
    queryKey: ['merchants', sectorId],
    queryFn: () =>
      api.get<MerchantListResponse>(`/metropol/merchants?sectorId=${sectorId}&listType=1`),
    // Liste büyük ve seyrek değişir; backend 6 saat cache'ler — istemci de uzun tutar.
    staleTime: 30 * 60 * 1000,
  });
}

export function useMerchantFeedback() {
  return useMutation({
    mutationFn: ({ code, message }: { code: string; message: string }) =>
      api.post(`/metropol/merchants/${encodeURIComponent(code)}/feedback`, {
        message,
      } satisfies MerchantFeedbackRequest),
  });
}
