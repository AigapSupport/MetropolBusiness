/** docs/API_CONTRACT.md §3 — HOME (Ana Sayfa) uçları. Tipler @shared/home'dan; çağrılar client üzerinden. */
import type { ItemList, Paged } from '@shared/common';
import type {
  Announcement,
  SurveyDetail,
  SurveyListItem,
  SurveyResponseCreated,
  SurveyResponseRequest,
  Video,
  VideoWatchRequest,
  VideoWatchState,
} from '@shared/home';

import { api } from './client';

export const homeApi = {
  /** Duyurular — firma + global birlikte, sayfalı zarf (§0.4). */
  getAnnouncements(page = 1, pageSize = 20): Promise<Paged<Announcement>> {
    return api.getPaged<Announcement>(`/home/announcements?page=${page}&pageSize=${pageSize}`);
  },
  /** Tek duyuru detayı. */
  getAnnouncement(id: string): Promise<Announcement> {
    return api.get<Announcement>(`/home/announcements/${id}`);
  },
  /** Yayındaki anketler — completed bayrağı isteyen kullanıcıya özeldir. */
  getSurveys(): Promise<ItemList<SurveyListItem>> {
    return api.get<ItemList<SurveyListItem>>('/home/surveys');
  },
  /** Sorularla birlikte anket detayı. */
  getSurveyDetail(id: string): Promise<SurveyDetail> {
    return api.get<SurveyDetail>(`/home/surveys/${id}`);
  },
  /** Anket yanıtı gönderir — tekrar yanıtta 409 SURVEY_ALREADY_ANSWERED dönebilir. */
  submitSurveyResponse(id: string, request: SurveyResponseRequest): Promise<SurveyResponseCreated> {
    return api.post<SurveyResponseCreated>(`/home/surveys/${id}/responses`, request);
  },
  /** Videolar — watched/progressSeconds kullanıcıya özeldir (PRD §6.5). */
  getVideos(): Promise<ItemList<Video>> {
    return api.get<ItemList<Video>>('/home/videos');
  },
  /** İzleme durumu yazar (upsert) — completed=true ile video "izlendi" olur. */
  watchVideo(id: string, request: VideoWatchRequest): Promise<VideoWatchState> {
    return api.post<VideoWatchState>(`/home/videos/${id}/watch`, request);
  },
};
