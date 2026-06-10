/**
 * Basit auth token store'u (Faz 0 iskeleti).
 * Access token localStorage'da tutulur; oturum açan panel kullanıcısının
 * profili (@shared MeResponse) bellekte saklanır.
 */

import type { MeResponse } from '@shared/me';

const ACCESS_TOKEN_KEY = 'accessToken';

/** Bellekte tutulan oturum kullanıcısı (sayfa yenilenince Faz 1'de /me ile dolacak). */
let currentUser: MeResponse | null = null;

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Giriş: access token'ı saklar. Gerçek e-posta+şifre ucu Faz 1'de bağlanacak. */
export function login(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  currentUser = null;
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

export function setCurrentUser(user: MeResponse | null): void {
  currentUser = user;
}

export function getCurrentUser(): MeResponse | null {
  return currentUser;
}
