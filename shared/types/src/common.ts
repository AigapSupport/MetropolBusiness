/** docs/API_CONTRACT.md §0 — genel zarflar ve ortak tipler. */

/** Para her zaman string taşınır: "500.00" (decimal kaybı olmadan). */
export type MoneyString = string;

/** ISO-8601 UTC tarih: "2026-06-10T10:18:00Z". */
export type IsoDateString = string;

/** Hata zarfı (§0.2): tüm hata yanıtları bu şekildedir. */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Sayfalama zarfı (§0.4). */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Yalnızca liste dönen uçlar için. */
export interface ItemList<T> {
  items: T[];
}

/** Makine-okur hata kodları (§14). */
export const ErrorCodes = {
  ValidationError: 'VALIDATION_ERROR',
  Unauthenticated: 'UNAUTHENTICATED',
  NotAuthorized: 'NOT_AUTHORIZED',
  NotAuthorizedModule: 'NOT_AUTHORIZED_MODULE',
  NotFound: 'NOT_FOUND',
  OtpInvalid: 'OTP_INVALID',
  OtpLocked: 'OTP_LOCKED',
  OtpRateLimit: 'OTP_RATE_LIMIT',
  SurveyAlreadyAnswered: 'SURVEY_ALREADY_ANSWERED',
  DuplicateOperation: 'DUPLICATE_OPERATION',
  MetropolError: 'METROPOL_ERROR',
  ProviderUnavailable: 'PROVIDER_UNAVAILABLE',
  RateLimited: 'RATE_LIMITED',
  InternalError: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
