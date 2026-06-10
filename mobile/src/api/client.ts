/**
 * İnce fetch sarmalayıcı API istemcisi.
 * - Base URL: src/utils/config.ts (TODO Faz 1: react-native-config ile .env'den)
 * - Authorization: Bearer <accessToken> — auth store setAuthToken ile besler.
 * - Hata zarfı: ErrorResponse (docs/API_CONTRACT.md §0.2) → ApiError olarak fırlatılır.
 * - TODO(Faz 1.2): 401 yanıtında refresh token ile sessiz yenileme ve isteği tekrarlama.
 */
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

let accessToken: string | null = null;

/** Auth store, oturum açılınca/kapanınca çağırır. */
export function setAuthToken(token: string | null): void {
  accessToken = token;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
): Promise<TResponse> {
  const headers: Record<string, string> = { Accept: 'application/json' };
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

  // TODO(Faz 1.2): response.status === 401 → refresh akışı (POST /auth/refresh) sonrası retry.
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
  post<TResponse>(path: string, body?: unknown): Promise<TResponse> {
    return request<TResponse>('POST', path, body);
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
