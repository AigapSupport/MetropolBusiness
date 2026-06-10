/**
 * Panel oturum store'u — access + refresh token çifti localStorage'da tutulur
 * (sayfa yenilemesinde oturum sürer). Kullanıcı profili server state'tir ve
 * React Query ile /me'den okunur (useMe) — burada saklanmaz.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/** Oturum token çifti — Authorization + sessiz yenileme için. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Login ve refresh rotasyonunda çağrılır. */
export function setSessionTokens(tokens: SessionTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/** Çıkış / oturum düşmesi — token'lar silinir. */
export function clearSessionTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
