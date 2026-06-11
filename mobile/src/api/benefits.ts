/** docs/API_CONTRACT.md §4 — BENEFITS (Yan Haklar) uçları. Tipler @shared/benefits'ten. */
import type {
  BenefitCategory,
  CampaignDetail,
  CampaignListItem,
  Coupon,
  GiftCard,
} from '@shared/benefits';
import type { ItemList, Paged } from '@shared/common';

import { api } from './client';

export const benefitsApi = {
  getCategories(): Promise<ItemList<BenefitCategory>> {
    return api.get<ItemList<BenefitCategory>>('/benefits/categories');
  },
  getCampaigns(categoryCode?: string, page = 1, pageSize = 20): Promise<Paged<CampaignListItem>> {
    const filter = categoryCode === undefined ? '' : `&categoryCode=${encodeURIComponent(categoryCode)}`;
    return api.getPaged<CampaignListItem>(`/benefits/campaigns?page=${page}&pageSize=${pageSize}${filter}`);
  },
  getCampaign(id: string): Promise<CampaignDetail> {
    return api.get<CampaignDetail>(`/benefits/campaigns/${id}`);
  },
  getCoupons(): Promise<ItemList<Coupon>> {
    return api.get<ItemList<Coupon>>('/benefits/coupons');
  },
  getGiftCards(): Promise<ItemList<GiftCard>> {
    return api.get<ItemList<GiftCard>>('/benefits/giftcards');
  },
};
