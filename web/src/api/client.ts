/**
 * Fetch tabanlı ince API istemcisi.
 * - Base URL env'den (VITE_API_BASE_URL).
 * - Authorization: Bearer <accessToken> header'ı otomatik eklenir.
 * - Hata yanıtları @shared ErrorResponse zarfı olarak işlenir ve ApiError fırlatılır.
 * - 401'de bir kez POST /auth/refresh denenir (eş zamanlı istekler tek refresh
 *   promise'ini paylaşır — mobile/src/api/client.ts ile aynı desen); refresh
 *   geçersizse oturum temizlenir ve /login'e düşülür.
 */

import type { RefreshRequest, RefreshResponse } from '@shared/auth';
import { ErrorCodes, type ErrorResponse, type Paged } from '@shared/common';
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  setSessionTokens,
} from '../store/auth';

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  /** JSON gövde — JSON.stringify ile gönderilir. */
  body?: unknown;
  signal?: AbortSignal;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

async function parseErrorBody(response: Response): Promise<ErrorResponse> {
  try {
    const data: unknown = await response.json();
    if (isErrorResponse(data)) {
      return data;
    }
  } catch {
    // Gövde JSON değilse aşağıdaki genel zarfa düşülür.
  }
  return {
    code: ErrorCodes.InternalError,
    message: `Beklenmeyen sunucu yanıtı (HTTP ${response.status}).`,
  };
}

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

/** POST /auth/refresh — özyineleme olmaması için apiFetch yerine ham fetch kullanır. */
async function requestRefresh(): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken();
  if (refreshToken === null) {
    return 'invalid';
  }
  try {
    const body: RefreshRequest = { refreshToken };
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // 401 = REFRESH_INVALID (rotasyon/iptal); diğer durumlar geçici kabul edilir.
      return response.status === 401 ? 'invalid' : 'unavailable';
    }
    const data = (await response.json()) as RefreshResponse;
    setSessionTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return 'refreshed';
  } catch {
    // Ağ hatasında oturum düşürülmez; çağıran isteğin kendi hatası gösterilir.
    return 'unavailable';
  }
}

/** Refresh geçersiz — token'ları temizle ve login'e dön (SPA dışı tam yönlendirme). */
function dropSession(): void {
  clearSessionTokens();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

async function execute(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  const token = getAccessToken();
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  return fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
    signal: options.signal,
  });
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await execute(path, options);

  // 401 → bir kez sessiz yenileme (auth uçları hariç; onların 401'i iş hatasıdır).
  if (response.status === 401 && getRefreshToken() !== null && !path.startsWith('/auth/')) {
    const outcome = await refreshSession();
    if (outcome === 'refreshed') {
      response = await execute(path, options);
    } else if (outcome === 'invalid') {
      dropSession();
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorBody(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    // Gövdesiz yanıt — çağıran T = void kullanmalı.
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/** Kısayollar. */
export const api = {
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return apiFetch<T>(path, { signal });
  },
  post<T>(path: string, requestBody?: unknown): Promise<T> {
    return apiFetch<T>(path, { method: 'POST', body: requestBody });
  },
  put<T>(path: string, requestBody?: unknown): Promise<T> {
    return apiFetch<T>(path, { method: 'PUT', body: requestBody });
  },
  delete<T>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: 'DELETE' });
  },
  /** Sayfalı liste uçları için kısayol (docs/API_CONTRACT.md §0.4). */
  getPaged<TItem>(path: string, signal?: AbortSignal): Promise<Paged<TItem>> {
    return apiFetch<Paged<TItem>>(path, { signal });
  },
};
