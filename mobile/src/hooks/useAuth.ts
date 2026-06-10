/**
 * Auth mutation hook'ları (React Query) + hata zarfı kodu → localization anahtarı eşleme.
 * Ekranlar hata mesajını t(getAuthErrorKey(error)) ile Türkçe/İngilizce gösterir.
 */
import { useMutation } from '@tanstack/react-query';

import { ErrorCodes } from '@shared/common';

import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';

/** POST /auth/otp/send mutation'ı. */
export function useSendOtp() {
  return useMutation({ mutationFn: authApi.sendOtp });
}

/** POST /auth/otp/verify mutation'ı. */
export function useVerifyOtp() {
  return useMutation({ mutationFn: authApi.verifyOtp });
}

/** Auth'a özgü hata kodlarının localization anahtarları (tr.json/en.json > auth.errors). */
const AUTH_ERROR_KEYS: Record<string, string> = {
  [ErrorCodes.OtpInvalid]: 'auth.errors.otpInvalid',
  [ErrorCodes.OtpLocked]: 'auth.errors.otpLocked',
  [ErrorCodes.OtpRateLimit]: 'auth.errors.otpRateLimit',
};

/** Hata zarfındaki koddan ekranda gösterilecek localization anahtarını üretir. */
export function getAuthErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    const key = AUTH_ERROR_KEYS[error.error.code];
    if (key !== undefined) {
      return key;
    }
  }
  return 'auth.errors.generic';
}

/** 3 hatalı deneme kilidi (OTP_LOCKED) mi? Ekran girişleri devre dışı bırakır. */
export function isOtpLockedError(error: unknown): boolean {
  return error instanceof ApiError && error.error.code === ErrorCodes.OtpLocked;
}
