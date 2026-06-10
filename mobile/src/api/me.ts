/**
 * docs/API_CONTRACT.md §2 — PROFİL (ME). Tipler @shared/me'den.
 * GET /me yanıtındaki tenant.branding, runtime white-label temayı besler (TODO 1.10).
 *
 * TODO(Faz sonrası — firma kodu girişi): login ÖNCESİ tema için anonim
 * GET /tenants/{code}/branding ucu hazır (API_CONTRACT §1); firma kodu giriş
 * ekranı eklendiğinde buraya getTenantBranding(code) eklenecek.
 */
import type { MeResponse } from '@shared/me';

import { api } from './client';

export const meApi = {
  getMe(): Promise<MeResponse> {
    return api.get<MeResponse>('/me');
  },
};
