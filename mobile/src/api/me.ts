/**
 * docs/API_CONTRACT.md §2 — PROFİL (ME). Tipler @shared/me'den.
 * GET /me yanıtındaki tenant.branding, runtime white-label temayı besler (TODO 1.10).
 *
 * TODO(Faz sonrası — firma kodu girişi): login ÖNCESİ tema için anonim
 * GET /tenants/{code}/branding ucu hazır (API_CONTRACT §1); firma kodu giriş
 * ekranı eklendiğinde buraya getTenantBranding(code) eklenecek.
 */
import type { MePreferences, MeResponse, UpdateMeRequest, UpdateTcknRequest } from '@shared/me';

import { api } from './client';

export const meApi = {
  getMe(): Promise<MeResponse> {
    return api.get<MeResponse>('/me');
  },
  updateMe(request: UpdateMeRequest): Promise<MeResponse> {
    return api.put<MeResponse>('/me', request);
  },
  /** TCKN düz metin yalnızca bu istekte taşınır; yanıt MASKELİ döner (CLAUDE.md kural 4). */
  updateTckn(request: UpdateTcknRequest): Promise<MeResponse> {
    return api.put<MeResponse>('/me/tckn', request);
  },
  getPreferences(): Promise<MePreferences> {
    return api.get<MePreferences>('/me/preferences');
  },
  updatePreferences(request: MePreferences): Promise<MePreferences> {
    return api.put<MePreferences>('/me/preferences', request);
  },
  /** Hesabımı sil (soft delete) — başarıda istemci oturumu kapatır. */
  deleteMe(): Promise<void> {
    return api.delete<void>('/me');
  },
};
