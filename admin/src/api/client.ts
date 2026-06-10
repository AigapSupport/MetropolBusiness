/**
 * fetch tabanlı ince API istemcisi.
 * - Base URL env'den (VITE_API_BASE_URL)
 * - Authorization: Bearer <accessToken>
 * - 401'de TEK-UÇUŞ refresh (TODO 1.9): eşzamanlı 401 alan istekler aynı
 *   POST /auth/refresh çağrısını paylaşır; başarılıysa istek BİR KEZ tekrarlanır,
 *   başarısızsa oturum temizlenir ve /login'e dönülür.
 * - Hata zarfı ErrorResponse (@shared/common) olarak işlenir.
 */

import type { PanelLoginResponse, RefreshRequest, RefreshResponse } from '@shared/auth';
import { ErrorCodes, type ErrorResponse } from '@shared/common';

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

const ACCESS_TOKEN_KEY = 'admin.accessToken';
const REFRESH_TOKEN_KEY = 'admin.refreshToken';
const USER_KEY = 'admin.user';

/** Oturumdaki kullanıcı özeti — DTO yeniden tanımlanmaz, @shared/auth'tan türetilir. */
export type SessionUser = PanelLoginResponse['user'];

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(
  accessToken: string,
  refreshToken: string,
  user: SessionUser,
): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** API hata zarfını taşıyan hata sınıfı. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorResponse;

  constructor(status: number, body: ErrorResponse) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Mutasyon/sorgu hatasını kullanıcıya gösterilebilir TR mesaja çevirir. */
export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.body.message;
  }
  return 'İşlem tamamlanamadı; lütfen tekrar deneyin.';
}

async function parseErrorBody(response: Response): Promise<ErrorResponse> {
  try {
    const parsed: unknown = await response.json();
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'code' in parsed &&
      'message' in parsed
    ) {
      return parsed as ErrorResponse;
    }
  } catch {
    // Gövde JSON değil — aşağıdaki genel zarfa düş.
  }
  return {
    code: ErrorCodes.InternalError,
    message: `İstek başarısız oldu (HTTP ${response.status}).`,
  };
}

async function performFetch(
  path: string,
  init: RequestInit,
  accessToken: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken !== null) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

/** Devam eden refresh uçuşu; eşzamanlı 401'ler bunu paylaşır (single-flight). */
let refreshFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (refreshToken === null) {
    return null;
  }
  try {
    const body: RefreshRequest = { refreshToken };
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as RefreshResponse;
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    // Rotasyon: backend her refresh'te yeni refresh token döner (API_CONTRACT §1).
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  refreshFlight ??= refreshSession().finally(() => {
    refreshFlight = null;
  });
  return refreshFlight;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await performFetch(path, init, getAccessToken());

  // 401: auth uçları dışında tek-uçuş refresh + isteği bir kez tekrar dene.
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const newToken = await refreshOnce();
    if (newToken === null) {
      clearSession();
      // Router dışından tetiklendiği için tam sayfa yönlendirme kullanılır.
      window.location.assign('/login');
      throw new ApiError(401, {
        code: ErrorCodes.Unauthenticated,
        message: 'Oturum süresi doldu; lütfen yeniden giriş yapın.',
      });
    }
    response = await performFetch(path, init, newToken);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorBody(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string): Promise<T> =>
    request<T>(path, { method: 'DELETE' }),
};
