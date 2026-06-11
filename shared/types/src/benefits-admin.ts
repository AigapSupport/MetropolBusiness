/**
 * Platform admin yan haklar yönetimi (API_CONTRACT §13) — backend birebir:
 * Application/Benefits/IPlatformBenefitsService.cs DTO'ları.
 */

import type { IsoDateString } from './common';

export interface AdminCategory {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  campaignCount: number;
}

export interface CategoryUpsertRequest {
  code: string;
  name: string;
  sortOrder: number;
}

export interface AdminCampaign {
  id: string;
  categoryId: string;
  categoryCode: string;
  title: string;
  body: string;
  brandLogoUrl: string | null;
  detailUrl: string | null;
  status: 'draft' | 'published';
  publishedAt: IsoDateString | null;
}

export interface CampaignUpsertRequest {
  categoryId: string;
  title: string;
  body: string;
  brandLogoUrl?: string | null;
  detailUrl?: string | null;
  status: 'draft' | 'published';
  publishedAt?: IsoDateString | null;
}
