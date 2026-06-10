/**
 * Basit auth store (context tabanlı).
 * TODO(Faz 1.2): token'lar secure storage'da (Keychain/Keystore) saklanacak ve
 * refresh token akışı eklenecek. Şimdilik yalnızca bellek içi state.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { OtpVerifyResponse } from '@shared/auth';

import { setAuthToken } from '@/api/client';

/** Oturum token çifti — POST /auth/otp/verify yanıtından (tip @shared'dan türetilir). */
export type AuthTokens = Pick<OtpVerifyResponse, 'accessToken' | 'refreshToken'>;

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  const login = useCallback((next: AuthTokens) => {
    setTokens(next);
    setAuthToken(next.accessToken);
  }, []);

  const logout = useCallback(() => {
    setTokens(null);
    setAuthToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: tokens !== null, login, logout }),
    [tokens, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  }
  return context;
}
