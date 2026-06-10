/**
 * Gerçek auth store (TODO 1.9): POST /auth/login ile e-posta+şifre panel girişi
 * (API_CONTRACT §1, PANELS_SPEC §0.4). Bu panel yalnızca platform_admin'e açıktır;
 * diğer panel rolleri token SAKLANMADAN reddedilir.
 */

import type { LogoutRequest, PanelLoginRequest, PanelLoginResponse } from '@shared/auth';
import { ErrorCodes } from '@shared/common';
import {
  api,
  ApiError,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getSessionUser,
  setSession,
  type SessionUser,
} from '../api/client';

const PLATFORM_ADMIN_ROLE = 'platform_admin';

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

export function currentUser(): SessionUser | null {
  return getSessionUser();
}

/**
 * Panel girişi. Backend panel rolü olmayanları zaten 403 ile reddeder;
 * platform_admin DIŞINDAKİ panel rolleri (company_admin/approver) için
 * erişim reddi burada uygulanır — token saklanmaz.
 */
export async function login(request: PanelLoginRequest): Promise<SessionUser> {
  const response = await api.post<PanelLoginResponse>('/auth/login', request);

  if (response.user.role !== PLATFORM_ADMIN_ROLE) {
    throw new ApiError(403, {
      code: ErrorCodes.NotAuthorized,
      message: 'Bu panel yalnızca platform yöneticilerine açıktır.',
    });
  }

  setSession(response.accessToken, response.refreshToken, response.user);
  return response.user;
}

/** Çıkış: refresh token sunucuda geçersiz kılınır, yerel oturum her durumda silinir. */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken !== null) {
    const body: LogoutRequest = { refreshToken };
    try {
      await api.post<undefined>('/auth/logout', body);
    } catch {
      // Sunucu tarafı iptal başarısız olsa da yerel oturum kapatılır.
    }
  }
  clearSession();
}
