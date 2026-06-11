/**
 * Auth store (context tabanlı).
 * - login: token çiftini state + API client + tokenStorage'a (Keychain/fallback) yazar.
 * - logout: hepsini temizler (RootNavigator auth state'e bağlı olduğundan login'e düşülür).
 * - Açılışta tokenStorage'dan oturum yüklenir; bu sürede isRestoring=true (Splash bekler).
 *   Biyometrik giriş açıksa (PRD §5.1) ve sensör varsa oturum ancak simplePrompt
 *   başarılı olursa açılır; başarısızlıkta token'lar SİLİNMEZ (logout değil) ama
 *   oturum açılmaz → login'e düşülür.
 * - 401 sessiz yenileme kancaları (configureAuthSession) burada bağlanır.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import type { TFunction } from 'i18next';

import { configureAuthSession, setAuthTokens } from '@/api/client';
import { isBiometricSensorAvailable, promptBiometric } from '@/utils/biometrics';

import { biometricPreferenceStorage, tokenStorage } from './tokenStorage';
import type { StoredTokens } from './tokenStorage';

/** Oturum token çifti — POST /auth/otp/verify yanıtından (tip @shared'dan türetilir). */
export type AuthTokens = StoredTokens;

interface AuthContextValue {
  /** Açılışta storage'dan oturum yükleniyor mu — Splash bu sürede bekler. */
  isRestoring: boolean;
  isAuthenticated: boolean;
  /** OTP doğrulamada isNewUser=true geldiyse profil tamamlanana dek true kalır. */
  isNewUser: boolean;
  /** Biyometrik giriş tercihi (PRD §5.1) — kalıcı (Keychain/fallback) saklanır. */
  biometricEnabled: boolean;
  /** Tercihi değiştirir ve kalıcı depoya yazar (Hesabım toggle'ı kullanır). */
  setBiometricEnabled: (enabled: boolean) => void;
  /**
   * OTP doğrulaması sonrası bir kerelik "Biyometrik girişi aç?" önerisi.
   * Kullanıcı daha önce seçim yaptıysa ya da sensör yoksa sessizce hiçbir şey yapmaz.
   */
  suggestEnableBiometrics: () => void;
  login: (tokens: AuthTokens, isNewUser: boolean) => void;
  /** Yeni kullanıcı profil tamamlamayı bitirince çağrılır → MainTabs'a geçilir. */
  completeProfile: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Doğrulama başarısız olduğunda "tekrar dene / iptal" sorusu (iptal → login'e düş). */
function askBiometricRetry(t: TFunction): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      t('auth.biometric.failedTitle'),
      t('auth.biometric.failedMessage'),
      [
        { text: t('auth.biometric.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('auth.biometric.retry'), onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

/** simplePrompt döngüsü: başarılıysa true; kullanıcı "iptal" deyince false. */
async function promptBiometricWithRetry(t: TFunction): Promise<boolean> {
  for (;;) {
    const unlocked = await promptBiometric(
      t('auth.biometric.promptTitle'),
      t('auth.biometric.promptCancel'),
    );
    if (unlocked) {
      return true;
    }
    const retry = await askBiometricRetry(t);
    if (!retry) {
      return false;
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  // t dil değişiminde yenilenir; restore effect'inin yeniden koşmaması için ref'te tutulur.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

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
    // Biyometrik tercih bilinçli olarak korunur (cihaz tercihi, oturum verisi değil).
    applyTokens(null);
    setIsNewUser(false);
    void tokenStorage.clear();
  }, [applyTokens]);

  const setBiometricEnabled = useCallback((enabled: boolean) => {
    setBiometricEnabledState(enabled);
    void biometricPreferenceStorage.save(enabled);
  }, []);

  const suggestEnableBiometrics = useCallback(() => {
    void (async () => {
      // Bir kerelik: daha önce seçim yapıldıysa (true/false) tekrar sorulmaz.
      const preference = await biometricPreferenceStorage.load();
      if (preference !== null) {
        return;
      }
      if (!(await isBiometricSensorAvailable())) {
        return;
      }
      const translate = tRef.current;
      Alert.alert(translate('auth.biometric.suggestTitle'), translate('auth.biometric.suggestMessage'), [
        {
          text: translate('auth.biometric.suggestLater'),
          style: 'cancel',
          onPress: () => setBiometricEnabled(false),
        },
        {
          text: translate('auth.biometric.suggestEnable'),
          onPress: () => setBiometricEnabled(true),
        },
      ]);
    })();
  }, [setBiometricEnabled]);

  // Uygulama açılışında storage'dan oturum yükle (Splash isRestoring=false'u bekler).
  // Biyometrik açıksa oturum ancak doğrulama başarılı olursa uygulanır (PRD §5.1).
  useEffect(() => {
    let cancelled = false;

    const restore = async (): Promise<void> => {
      const [stored, preference] = await Promise.all([
        tokenStorage.load(),
        biometricPreferenceStorage.load(),
      ]);
      if (cancelled) {
        return;
      }
      if (preference === true) {
        setBiometricEnabledState(true);
      }
      if (stored === null) {
        return;
      }
      if (preference === true && (await isBiometricSensorAvailable())) {
        const unlocked = await promptBiometricWithRetry(tRef.current);
        if (cancelled || !unlocked) {
          // Oturum AÇILMAZ ama token'lar silinmez (logout değil) — login'e düşülür;
          // kullanıcı OTP ile girince depo zaten yeni token çiftiyle güncellenir.
          return;
        }
      }
      if (!cancelled) {
        // NOT: restore edilen oturumda profil durumu bilinmez; isNewUser=false
        // varsayılır. GET /me ucu hazır olunca açılışta doğrulanacak.
        applyTokens(stored);
      }
    };

    restore()
      .catch(() => {
        // Depo/biyometrik katmanı okunamadıysa oturumsuz devam edilir.
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
      setBiometricEnabled,
      suggestEnableBiometrics,
      login,
      completeProfile,
      logout,
    }),
    [
      isRestoring,
      tokens,
      isNewUser,
      biometricEnabled,
      setBiometricEnabled,
      suggestEnableBiometrics,
      login,
      completeProfile,
      logout,
    ],
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
