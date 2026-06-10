/**
 * docs/API_CONTRACT.md §12 — firma admin uçları (kullanıcı/segment + içerik).
 * Tipler @shared/content-admin'den (backend CompanyAdminDtos.cs / ContentAdminDtos.cs
 * birebir karşılıkları); tüm uçlar company_admin rolü ve kendi tenant'ıyla sınırlı.
 */

import type { ItemList, Paged } from '@shared/common';
import type {
  AdminAnnouncementDto,
  AdminSurveyDetailDto,
  AdminSurveyListItemDto,
  AdminVideoDto,
  AnnouncementUpsertRequest,
  CompanySegmentDto,
  CompanyUserCreateRequest,
  CompanyUserDto,
  CompanyUserUpdateRequest,
  SegmentModulesUpdateRequest,
  SegmentUpsertRequest,
  SurveyResultsDto,
  SurveyUpsertRequest,
  UserSegmentsUpdateRequest,
  VideoUpsertRequest,
  VideoWatchReportDto,
} from '@shared/content-admin';
import { api } from './client';

export interface UsersQuery {
  q?: string;
  segmentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function usersQueryString(query: UsersQuery): string {
  const params = new URLSearchParams();
  if (query.q !== undefined && query.q !== '') params.set('q', query.q);
  if (query.segmentId !== undefined && query.segmentId !== '') {
    params.set('segmentId', query.segmentId);
  }
  if (query.status !== undefined && query.status !== '') params.set('status', query.status);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 20));
  return params.toString();
}

export const adminApi = {
  // ── Kullanıcılar ────────────────────────────────────────────────────────
  getUsers(query: UsersQuery): Promise<Paged<CompanyUserDto>> {
    return api.getPaged<CompanyUserDto>(`/admin/company/users?${usersQueryString(query)}`);
  },
  createUser(request: CompanyUserCreateRequest): Promise<CompanyUserDto> {
    return api.post<CompanyUserDto>('/admin/company/users', request);
  },
  updateUser(id: string, request: CompanyUserUpdateRequest): Promise<CompanyUserDto> {
    return api.put<CompanyUserDto>(`/admin/company/users/${id}`, request);
  },
  /** DELETE pasifleştirir (hard delete yok — API_CONTRACT §12). */
  deactivateUser(id: string): Promise<void> {
    return api.delete<void>(`/admin/company/users/${id}`);
  },
  setUserSegments(id: string, request: UserSegmentsUpdateRequest): Promise<CompanyUserDto> {
    return api.put<CompanyUserDto>(`/admin/company/users/${id}/segments`, request);
  },

  // ── Segmentler ──────────────────────────────────────────────────────────
  getSegments(): Promise<ItemList<CompanySegmentDto>> {
    return api.get<ItemList<CompanySegmentDto>>('/admin/company/segments');
  },
  createSegment(request: SegmentUpsertRequest): Promise<CompanySegmentDto> {
    return api.post<CompanySegmentDto>('/admin/company/segments', request);
  },
  updateSegment(id: string, request: SegmentUpsertRequest): Promise<CompanySegmentDto> {
    return api.put<CompanySegmentDto>(`/admin/company/segments/${id}`, request);
  },
  /** Segmentte kullanıcı varsa VALIDATION_ERROR + details.userCount döner. */
  deleteSegment(id: string): Promise<void> {
    return api.delete<void>(`/admin/company/segments/${id}`);
  },
  setSegmentModules(
    id: string,
    request: SegmentModulesUpdateRequest,
  ): Promise<CompanySegmentDto> {
    return api.put<CompanySegmentDto>(`/admin/company/segments/${id}/modules`, request);
  },

  // ── İçerik: Anketler ────────────────────────────────────────────────────
  getSurveys(): Promise<ItemList<AdminSurveyListItemDto>> {
    return api.get<ItemList<AdminSurveyListItemDto>>('/admin/company/surveys');
  },
  getSurvey(id: string): Promise<AdminSurveyDetailDto> {
    return api.get<AdminSurveyDetailDto>(`/admin/company/surveys/${id}`);
  },
  createSurvey(request: SurveyUpsertRequest): Promise<AdminSurveyDetailDto> {
    return api.post<AdminSurveyDetailDto>('/admin/company/surveys', request);
  },
  updateSurvey(id: string, request: SurveyUpsertRequest): Promise<AdminSurveyDetailDto> {
    return api.put<AdminSurveyDetailDto>(`/admin/company/surveys/${id}`, request);
  },
  deleteSurvey(id: string): Promise<void> {
    return api.delete<void>(`/admin/company/surveys/${id}`);
  },
  getSurveyResults(id: string): Promise<SurveyResultsDto> {
    return api.get<SurveyResultsDto>(`/admin/company/surveys/${id}/results`);
  },

  // ── İçerik: Duyurular ───────────────────────────────────────────────────
  getAnnouncements(): Promise<ItemList<AdminAnnouncementDto>> {
    return api.get<ItemList<AdminAnnouncementDto>>('/admin/company/announcements');
  },
  createAnnouncement(request: AnnouncementUpsertRequest): Promise<AdminAnnouncementDto> {
    return api.post<AdminAnnouncementDto>('/admin/company/announcements', request);
  },
  updateAnnouncement(
    id: string,
    request: AnnouncementUpsertRequest,
  ): Promise<AdminAnnouncementDto> {
    return api.put<AdminAnnouncementDto>(`/admin/company/announcements/${id}`, request);
  },
  deleteAnnouncement(id: string): Promise<void> {
    return api.delete<void>(`/admin/company/announcements/${id}`);
  },

  // ── İçerik: Videolar ────────────────────────────────────────────────────
  getVideos(): Promise<ItemList<AdminVideoDto>> {
    return api.get<ItemList<AdminVideoDto>>('/admin/company/videos');
  },
  createVideo(request: VideoUpsertRequest): Promise<AdminVideoDto> {
    return api.post<AdminVideoDto>('/admin/company/videos', request);
  },
  updateVideo(id: string, request: VideoUpsertRequest): Promise<AdminVideoDto> {
    return api.put<AdminVideoDto>(`/admin/company/videos/${id}`, request);
  },
  deleteVideo(id: string): Promise<void> {
    return api.delete<void>(`/admin/company/videos/${id}`);
  },
  getVideoWatchReport(id: string): Promise<VideoWatchReportDto> {
    return api.get<VideoWatchReportDto>(`/admin/company/videos/${id}/watch-report`);
  },
};
