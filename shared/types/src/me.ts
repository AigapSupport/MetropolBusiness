/** docs/API_CONTRACT.md §2 — PROFİL (ME). */

export type UserRole = 'enduser' | 'company_admin' | 'approver' | 'platform_admin';

export interface TenantBranding {
  logoUrl: string;
  primaryColor: string;
  secondaryColor?: string;
}

export interface MeResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  tcknMasked: string | null;
  city: string | null;
  avatarUrl: string | null;
  role: UserRole;
  tenant: {
    id: string;
    name: string;
    branding: TenantBranding;
  };
}

export interface UpdateMeRequest {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  avatarUrl?: string;
}

export interface UpdateTcknRequest {
  tckn: string;
}

export interface MePreferences {
  campaignNotifications: boolean;
  announcementNotifications: boolean;
}

/** GET /me/modules — kullanıcının segmentine göre yetkili modüller. */
export interface ModuleInfo {
  code: string;
  name: string;
}

export interface MeModulesResponse {
  modules: ModuleInfo[];
}
