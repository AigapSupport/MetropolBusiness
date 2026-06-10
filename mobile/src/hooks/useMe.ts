/**
 * GET /me hook'u (API_CONTRACT §2) — login sonrası profil + tenant.branding
 * (runtime white-label tema, TODO 1.10) buradan beslenir.
 */
import { useQuery } from '@tanstack/react-query';

import { meApi } from '@/api/me';

export const meKeys = {
  me: ['me'] as const,
};

export function useMe(enabled = true) {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: meApi.getMe,
    enabled,
    staleTime: 5 * 60 * 1000, // profil/branding sık değişmez
  });
}
