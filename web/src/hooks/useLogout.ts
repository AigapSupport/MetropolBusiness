/** Çıkış akışı: POST /auth/logout (en iyi çaba) → token + query cache temizliği → /login. */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { clearSessionTokens, getRefreshToken } from '../store/auth';

export function useLogout(): () => Promise<void> {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken !== null) {
      try {
        // Backend her durumda 204 döner; ağ hatası çıkışı engellememeli.
        await authApi.logout({ refreshToken });
      } catch {
        // Yut: lokal oturum yine de kapatılır.
      }
    }
    clearSessionTokens();
    queryClient.clear();
    navigate('/login', { replace: true });
  }, [navigate, queryClient]);
}
