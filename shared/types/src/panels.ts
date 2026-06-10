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
  hasMetropolConsumer: boolean;
  branding: TenantBranding;
  createdAt: IsoDateString;
}

export interface CreateTenantRequest {
  name: string;
  code: string;
  metropolConsumerId?: string;
  branding: TenantBranding;
}

export interface InviteTenantAdminRequest {
  firstName: string;
  email: string;
}

export interface ModuleDefinition {
  id: string;
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
