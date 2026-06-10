/**
 * Fetch tabanlı ince API istemcisi.
 * - Base URL env'den (VITE_API_BASE_URL).
 * - Authorization: Bearer <accessToken> header'ı otomatik eklenir.
 * - Hata yanıtları @shared ErrorResponse zarfı olarak işlenir ve ApiError fırlatılır.
 */

import { ErrorCodes, type ErrorResponse } from '@shared/common';
import { getAccessToken } from '../store/auth';

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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
    signal: options.signal,
  });

  if (!response.ok) {
    // TODO(Faz 1.2): 401'de refresh token ile access token yenile ve isteği bir kez tekrarla.
    throw new ApiError(response.status, await parseErrorBody(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
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
};
