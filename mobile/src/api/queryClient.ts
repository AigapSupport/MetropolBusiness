/** Sunucu state için tek React Query istemcisi (CLAUDE.md §7 — dağınık fetch yok). */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});
