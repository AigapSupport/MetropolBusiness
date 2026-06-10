/** docs/API_CONTRACT.md §1 — panel auth uçları. Tipler @shared/auth'tan. */

import type {
  LogoutRequest,
  PanelLoginRequest,
  PanelLoginResponse,
  SetPasswordRequest,
} from '@shared/auth';
import { api } from './client';

export const authApi = {
  /** POST /auth/login — e-posta+şifre (PANELS_SPEC §0.4); yalnız panel rolleri. */
  login(request: PanelLoginRequest): Promise<PanelLoginResponse> {
    return api.post<PanelLoginResponse>('/auth/login', request);
  },
  /** POST /auth/set-password — davet token'ı ile ilk şifre (72 saat, tek kullanımlık). */
  setPassword(request: SetPasswordRequest): Promise<void> {
    return api.post<void>('/auth/set-password', request);
  },
  /** POST /auth/logout — refresh geçersiz kılınır; her durumda 204. */
  logout(request: LogoutRequest): Promise<void> {
    return api.post<void>('/auth/logout', request);
  },
};
