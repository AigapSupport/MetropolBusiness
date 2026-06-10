/**
 * Hata → kullanıcı mesajı. Backend zaten Türkçe, gösterilebilir `message` döner
 * (API_CONTRACT §0.2); ApiError dışındaki hatalarda genel mesaja düşülür.
 */

import { ApiError } from '../api/client';

const GENERIC_MESSAGE = 'Bir hata oluştu. Lütfen tekrar deneyin.';

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.error.message : GENERIC_MESSAGE;
}

/** ApiError ise makine-okur kodu döner (örn. LOGIN_LOCKED), değilse null. */
export function apiErrorCode(error: unknown): string | null {
  return error instanceof ApiError ? error.error.code : null;
}

/** details içinden sayısal alan okur (örn. segment silme → userCount). */
export function apiErrorDetailNumber(error: unknown, key: string): number | null {
  if (!(error instanceof ApiError) || error.error.details === undefined) {
    return null;
  }
  const value = error.error.details[key];
  return typeof value === 'number' ? value : null;
}
