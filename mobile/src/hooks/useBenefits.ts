/** Yan Haklar React Query hook'ları (PRD §7). */
import { useQuery } from '@tanstack/react-query';

import { benefitsApi } from '@/api/benefits';

export function useBenefitCategories() {
  return useQuery({
    queryKey: ['benefits', 'categories'],
    queryFn: () => benefitsApi.getCategories(),
  });
}

export function useCampaigns(categoryCode?: string) {
  return useQuery({
    queryKey: ['benefits', 'campaigns', categoryCode ?? 'all'],
    queryFn: () => benefitsApi.getCampaigns(categoryCode),
  });
}

export function useCampaignDetail(id: string) {
  return useQuery({
    queryKey: ['benefits', 'campaigns', 'detail', id],
    queryFn: () => benefitsApi.getCampaign(id),
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: ['benefits', 'coupons'],
    queryFn: () => benefitsApi.getCoupons(),
  });
}

export function useGiftCards() {
  return useQuery({
    queryKey: ['benefits', 'giftcards'],
    queryFn: () => benefitsApi.getGiftCards(),
  });
}
