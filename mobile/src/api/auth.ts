/** docs/API_CONTRACT.md §1 — AUTH uçları. Tipler @shared/auth'tan; çağrılar client üzerinden. */
import type {
  LogoutRequest,
  OtpSendRequest,
  OtpSendResponse,
  OtpVerifyRequest,
  OtpVerifyResponse,
  RefreshRequest,
  RefreshResponse,
} from '@shared/auth';

import { api } from './client';

export const authApi = {
  /** OTP gönderir — 429 OTP_RATE_LIMIT dönebilir. */
  sendOtp(request: OtpSendRequest): Promise<OtpSendResponse> {
    return api.post<OtpSendResponse>('/auth/otp/send', request);
  },
  /** OTP doğrular — 400 OTP_INVALID, 423 OTP_LOCKED (3 deneme) dönebilir. */
  verifyOtp(request: OtpVerifyRequest): Promise<OtpVerifyResponse> {
    return api.post<OtpVerifyResponse>('/auth/otp/verify', request);
  },
  /** Token yeniler (rotasyon) — sessiz yenileme client.ts içinde ayrıca ele alınır. */
  refresh(request: RefreshRequest): Promise<RefreshResponse> {
    return api.post<RefreshResponse>('/auth/refresh', request);
  },
  /** Refresh token'ı geçersiz kılar — her durumda 204. */
  logout(request: LogoutRequest): Promise<void> {
    return api.post<void>('/auth/logout', request);
  },
};
