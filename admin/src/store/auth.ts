/**
 * Sahte auth store — iskelet aşaması.
 * Faz 1'de gerçek auth (JWT access+refresh, platform_admin rolü) ile değiştirilecek.
 */

import { clearAccessToken, getAccessToken, setAccessToken } from '../api/client';

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/** Sahte giriş: gerçek doğrulama yok, yerel sahte token yazılır. */
export function login(): void {
  setAccessToken(`fake-admin-token-${Date.now()}`);
}

export function logout(): void {
  clearAccessToken();
}
