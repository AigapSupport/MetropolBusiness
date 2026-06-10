/** docs/API_CONTRACT.md §4 — BENEFITS (YAN HAKLAR). */

import type { IsoDateString, MoneyString } from './common';

export interface BenefitCategory {
  code: string;
  name: string;
}

export interface CampaignListItem {
  id: string;
  title: string;
  brandLogoUrl: string | null;
  categoryCode: string;
}

export interface CampaignDetail {
  id: string;
  title: string;
  body: string;
  brandLogoUrl: string | null;
  detailUrl: string | null;
  similar: Array<{ id: string; title: string }>;
}

export interface Coupon {
  id: string;
  title: string;
  brand: string;
  amount: MoneyString;
  expiresAt: IsoDateString;
}

export interface GiftCard {
  id: string;
  title: string;
  brand: string;
  amount: MoneyString;
  expiresAt: IsoDateString;
}
