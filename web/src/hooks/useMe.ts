/** GET /me — oturum kullanıcısı + tenant bilgisi (server state, React Query). */

import { useQuery } from '@tanstack/react-query';
import type { MeResponse } from '@shared/me';
import { api } from '../api/client';
import { isAuthenticated } from '../store/auth';

export const ME_QUERY_KEY = ['me'] as const;

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ME_QUERY_KEY,
    queryFn: () => api.get<MeResponse>('/me'),
    enabled: isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}
