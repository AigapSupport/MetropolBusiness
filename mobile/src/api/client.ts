/**
 * İnce fetch sarmalayıcı API istemcisi.
 * - Base URL: src/utils/config.ts (TODO Faz 1: react-native-config ile .env'den)
 * - Authorization: Bearer <accessToken> — auth store setAuthTokens ile besler.
 * - Hata zarfı: ErrorResponse (docs/API_CONTRACT.md §0.2) → ApiError olarak fırlatılır.
 * - 401'de bir kez POST /auth/refresh denenir (eş zamanlı istekler tek refresh
 *   promise'ini paylaşır); başarılıysa istek tekrarlanır, refresh geçersizse
 *   onSessionExpired tetiklenir (auth store logout → RootNavigator login'e düşer).
 */
import type { RefreshRequest, RefreshResponse } from '@shared/auth';
import { ErrorCodes } from '@shared/common';
import type { ErrorResponse, Paged } from '@shared/common';

import { config } from '@/utils/config';

export class ApiError extends Error {
  readonly status: number;
  readonly error: ErrorResponse;

  constructor(status: number, error: ErrorResponse) {
    super(error.message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
  }
}

/** Oturum token çifti — istemcinin Authorization + refresh için tuttuğu değerler. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Sessiz yenileme sonuçlarını auth store'a bildiren kancalar. */
export interface AuthSessionHandlers {
  /** Refresh başarılı — yeni token çifti kalıcı depoya yazılmalı. */
  onTokensRefreshed: (tokens: SessionTokens) => void;
  /** Refresh geçersiz — oturum kapatılmalı (login'e düşme). */
  onSessionExpired: () => void;
}

let sessionHandlers: AuthSessionHandlers | null = null;

/** AuthProvider mount olurken kancaları bağlar, unmount'ta null'lar. */
export function configureAuthSession(handlers: AuthSessionHandlers | null): void {
  sessionHandlers = handlers;
}

/** Auth store, oturum açılınca/kapanınca/yenilenince çağırır. */
export function setAuthTokens(tokens: SessionTokens | null): void {
  if (tokens === null) {
    accessToken = null;
    refreshToken = null;
    return;
  }
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Refresh denemesinin sonucu:
 * - refreshed: yeni token alındı, istek tekrarlanabilir
 * - invalid: refresh token geçersiz (REFRESH_INVALID) — oturum düşmeli
 * - unavailable: ağ/sunucu sorunu — oturum düşürülmez, asıl hata yüzeye çıkar
 */
type RefreshOutcome = 'refreshed' | 'invalid' | 'unavailable';

let refreshPromise: Promise<RefreshOutcome> | null = null;

/** Eş zamanlı 401'lerde tek refresh isteği paylaşılır (single-flight). */
function refreshSession(): Promise<RefreshOutcome> {
  if (refreshPromise === null) {
    refreshPromise = requestRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** POST /auth/refresh — özyineleme olmaması için request() yerine ham fetch kullanır. */
async function requestRefresh(): Promise<RefreshOutcome> {
  if (refreshToken === null) {
    return 'invalid';
  }
  try {
    const body: RefreshRequest = { refreshToken };
    const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // 401 = REFRESH_INVALID (rotasyon/iptal); diğer durumlar geçici kabul edilir.
      return response.status === 401 ? 'invalid' : 'unavailable';
    }
    const data = (await response.json()) as RefreshResponse;
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;
    sessionHandlers?.onTokensRefreshed({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return 'refreshed';
  } catch {
    // Ağ hatasında oturum düşürülmez; çağıran isteğin kendi hatası gösterilir.
    return 'unavailable';
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  // Daraltma için güvenli görünüm; alanlar tek tek doğrulanıyor.
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

async function toErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    const data: unknown = await response.json();
    if (isErrorResponse(data)) {
      return data;
    }
  } catch {
    // Gövde JSON değil — aşağıdaki genel hata zarfına düş.
  }
  return {
    code: ErrorCodes.InternalError,
    message: `Beklenmeyen sunucu yanıtı (HTTP ${response.status})`,
  };
}

async function request<TResponse>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  isRetry = false,
  extraHeaders?: Record<string, string>,
): Promise<TResponse> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };
  if (accessToken !== null) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → bir kez sessiz yenileme (auth uçları hariç; onların 401'i iş hatasıdır).
  if (response.status === 401 && !isRetry && refreshToken !== null && !path.startsWith('/auth/')) {
    const outcome = await refreshSession();
    if (outcome === 'refreshed') {
      // Aynı ekstra başlıklarla tekrar: para uçlarında Idempotency-Key korunmalı.
      return request<TResponse>(method, path, body, true, extraHeaders);
    }
    if (outcome === 'invalid') {
      sessionHandlers?.onSessionExpired();
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await toErrorResponse(response));
  }

  const text = await response.text();
  if (text.length === 0) {
    // Gövdesiz yanıt (204 vb.) — çağıran TResponse = void kullanmalı.
    return undefined as unknown as TResponse;
  }
  return JSON.parse(text) as TResponse;
}

export const api = {
  get<TResponse>(path: string): Promise<TResponse> {
    return request<TResponse>('GET', path);
  },
  /** headers: para hareketi uçlarında zorunlu Idempotency-Key gibi ek başlıklar (§0.1). */
  post<TResponse>(path: string, body?: unknown, headers?: Record<string, string>): Promise<TResponse> {
    return request<TResponse>('POST', path, body, false, headers);
  },
  put<TResponse>(path: string, body?: unknown): Promise<TResponse> {
    return request<TResponse>('PUT', path, body);
  },
  patch<TResponse>(path: string, body?: unknown): Promise<TResponse> {
    return request<TResponse>('PATCH', path, body);
  },
  delete<TResponse>(path: string): Promise<TResponse> {
    return request<TResponse>('DELETE', path);
  },
  /** Sayfalı liste uçları için kısayol (docs/API_CONTRACT.md §0.4). */
  getPaged<TItem>(path: string): Promise<Paged<TItem>> {
    return request<Paged<TItem>>('GET', path);
  },
};
