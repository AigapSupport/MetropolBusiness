/** docs/API_CONTRACT.md §1 — AUTH. */

export interface OtpSendRequest {
  phone: string;
  companyCode?: string;
}

export interface OtpSendResponse {
  otpRef: string;
  expiresInSeconds: number;
  resendInSeconds: number;
}

export interface OtpVerifyRequest {
  otpRef: string;
  code: string;
  phone: string;
}

export interface OtpVerifyResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LogoutRequest {
  refreshToken: string;
}

// ── Panel girişi (web/admin) — kendi auth, e-posta+şifre (LESSONS.md kararı) ──

export interface PanelLoginRequest {
  email: string;
  password: string;
  /** Aynı e-posta birden çok tenant'ta varsa zorunlu. */
  companyCode?: string;
}

export interface PanelLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

/** Davet token'ı ile ilk şifre belirleme (tek kullanımlık, 72 saat geçerli). */
export interface SetPasswordRequest {
  inviteToken: string;
  newPassword: string;
}
