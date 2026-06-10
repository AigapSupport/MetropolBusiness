/** docs/API_CONTRACT.md §12–13 — WEB (firma admin) ve ADMIN (platform) panel tipleri. */

import type { IsoDateString } from './common';
import type { TenantBranding, UserRole } from './me';

// ── §12 Web — firma admin ───────────────────────────────

export interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: 'active' | 'passive';
  segments: Array<{ id: string; name: string }>;
  lastLoginAt: IsoDateString | null;
}

export interface CreateCompanyUserRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: Extract<UserRole, 'enduser' | 'approver'>;
  segmentIds?: string[];
}

export interface Segment {
  id: string;
  name: string;
  userCount: number;
  moduleCount: number;
  createdAt: IsoDateString;
}

export interface SetSegmentModulesRequest {
  moduleCodes: string[];
}

export interface SetUserSegmentsRequest {
  segmentIds: string[];
}

// ── §13 Admin — platform ────────────────────────────────

export type TenantStatus = 'active' | 'passive' | 'pending';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  status: TenantStatus;
  userCount: number;
  /**
   * Metropol consumer eşleşmesi var mı. NOT: backend PlatformTenantDto bu alanı henüz
   * DÖNDÜRMÜYOR (secret referansı yanıta çıkarılmaz; PlatformAdminDtos.cs). Alan backend'e
   * eklenene kadar istemcide `undefined` gelir — UI "bilinmiyor" gösterir.
   */
  hasMetropolConsumer?: boolean;
  /** Dikkat: backend marka alanlarını null dönebilir (TenantBrandingDto tüm alanlar nullable). */
  branding: TenantBranding;
  createdAt: IsoDateString;
}

export interface CreateTenantRequest {
  name: string;
  code: string;
  metropolConsumerId?: string;
  branding: TenantBranding;
}

/**
 * Tenant güncelle + durum değişimi (PUT /platform/tenants/{id}) —
 * backend: PlatformAdminDtos.cs > TenantUpdateRequest. Gönderilmeyen alan = değiştirme;
 * code bilinçli yok (login fallback anahtarı, değişimi ayrı karar gerektirir).
 */
export interface UpdateTenantRequest {
  name?: string;
  metropolConsumerId?: string;
  branding?: TenantBranding;
  status?: TenantStatus;
}

/**
 * Firma admin daveti (POST /platform/tenants/{id}/admins) —
 * backend: PlatformAdminDtos.cs > TenantAdminInviteRequest. Telefon ZORUNLU
 * (panel/mobil girişi OTP ile telefon üzerinden); e-posta/soyad opsiyonel.
 */
export interface InviteTenantAdminRequest {
  phone: string;
  firstName: string;
  lastName?: string;
  email?: string;
}

/**
 * Davet yanıtı (PII'siz) — backend: PlatformAdminDtos.cs > TenantAdminCreatedDto ile birebir.
 * inviteToken YALNIZCA bu yanıtta döner (şifre belirleme: POST /auth/set-password,
 * 72 saat geçerli, tek kullanımlık); tekrar sorgulanamaz ve log'lanmaz.
 */
export interface InviteTenantAdminResponse {
  id: string;
  tenantId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  inviteToken: string;
}

export interface ModuleDefinition {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

/** Modül oluştur/güncelle isteği (POST/PUT /platform/modules) — backend: ModuleUpsertRequest. */
export interface ModuleUpsertRequest {
  code: string;
  name: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  /** PII içermez (ARCHITECTURE §4.7). */
  metadata: Record<string, unknown>;
  createdAt: IsoDateString;
}
