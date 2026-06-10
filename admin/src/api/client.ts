/**
 * fetch tabanlı ince API istemcisi.
 * - Base URL env'den (VITE_API_BASE_URL)
 * - Authorization: Bearer <token>
 * - Hata zarfı ErrorResponse (@shared/common) olarak işlenir.
 */

import { ErrorCodes, type ErrorResponse } from '@shared/common';

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

const ACCESS_TOKEN_KEY = 'admin.accessToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token !== null) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    // TODO(Faz 1.2): 401'de refresh token ile sessiz yenileme ve login'e düşme.
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
