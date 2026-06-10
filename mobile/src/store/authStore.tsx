/**
 * Auth store (context tabanlı).
 * - login: token çiftini state + API client + tokenStorage'a (Keychain/fallback) yazar.
 * - logout: hepsini temizler (RootNavigator auth state'e bağlı olduğundan login'e düşülür).
 * - Açılışta tokenStorage'dan oturum yüklenir; bu sürede isRestoring=true (Splash bekler).
 * - 401 sessiz yenileme kancaları (configureAuthSession) burada bağlanır.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { configureAuthSession, setAuthTokens } from '@/api/client';

import { tokenStorage } from './tokenStorage';
import type { StoredTokens } from './tokenStorage';

/** Oturum token çifti — POST /auth/otp/verify yanıtından (tip @shared'dan türetilir). */
export type AuthTokens = StoredTokens;

interface AuthContextValue {
  /** Açılışta storage'dan oturum yükleniyor mu — Splash bu sürede bekler. */
  isRestoring: boolean;
  isAuthenticated: boolean;
  /** OTP doğrulamada isNewUser=true geldiyse profil tamamlanana dek true kalır. */
  isNewUser: boolean;
  /**
   * Biyometrik giriş tercihi — şimdilik placeholder (her zaman false).
   * TODO(Faz 1.2+): react-native-biometrics native klasörler eklenince bağlanacak
   * (LESSONS.md RN native kaydı); PRD §5.1 Face ID / parmak izi ile tekrar giriş.
   */
  biometricEnabled: boolean;
  login: (tokens: AuthTokens, isNewUser: boolean) => void;
  /** Yeni kullanıcı profil tamamlamayı bitirince çağrılır → MainTabs'a geçilir. */
  completeProfile: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  // Placeholder — gerçek değer biyometrik modülü bağlanınca storage'dan okunacak.
  const [biometricEnabled] = useState(false);

  /** State + API client'ı birlikte günceller (tek doğruluk noktası). */
  const applyTokens = useCallback((next: AuthTokens | null) => {
    setTokens(next);
    setAuthTokens(next);
  }, []);

  const login = useCallback(
    (next: AuthTokens, newUser: boolean) => {
      applyTokens(next);
      setIsNewUser(newUser);
      void tokenStorage.save(next);
    },
    [applyTokens],
  );

  const completeProfile = useCallback(() => {
    setIsNewUser(false);
  }, []);

  const logout = useCallback(() => {
    // TODO(Faz 1.x): kullanıcı tetikli çıkışta POST /auth/logout da çağrılacak
    // (Hesabım ekranı gelince); sessiz yenileme düşüşünde yerel temizlik yeterli.
    applyTokens(null);
    setIsNewUser(false);
    void tokenStorage.clear();
  }, [applyTokens]);

  // Uygulama açılışında storage'dan oturum yükle (Splash isRestoring=false'u bekler).
  useEffect(() => {
    let cancelled = false;
    tokenStorage
      .load()
      .then((stored) => {
        if (!cancelled && stored !== null) {
          // NOT: restore edilen oturumda profil durumu bilinmez; isNewUser=false
          // varsayılır. GET /me ucu hazır olunca açılışta doğrulanacak.
          applyTokens(stored);
        }
      })
      .catch(() => {
        // Depo okunamadıysa oturumsuz devam edilir.
      })
      .finally(() => {
        if (!cancelled) {
          setIsRestoring(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyTokens]);

  // 401 sessiz yenileme kancaları: yeni tokenlar depoya yazılır, geçersizse logout.
  useEffect(() => {
    configureAuthSession({
      onTokensRefreshed: (next) => {
        setTokens(next);
        void tokenStorage.save(next);
      },
      onSessionExpired: logout,
    });
    return () => configureAuthSession(null);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isRestoring,
      isAuthenticated: tokens !== null,
      isNewUser,
      biometricEnabled,
      login,
      completeProfile,
      logout,
    }),
    [isRestoring, tokens, isNewUser, biometricEnabled, login, completeProfile, logout],
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
