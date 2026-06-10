/**
 * docs/API_CONTRACT.md §12 — WEB (firma admin) içerik + kullanıcı/segment yönetim tipleri.
 * Birebir kaynak: backend/src/MetropolBusiness.Application/Content/ContentAdminDtos.cs
 * ve Tenants/CompanyAdminDtos.cs (alan adları backend DTO'larıyla aynı, camelCase wire).
 */

import type { IsoDateString } from './common';
import type { SurveyQuestion, SurveyQuestionType } from './home';

/** Anket/duyuru yayın durumu (wire: "draft" | "published"). */
export type ContentStatus = 'draft' | 'published';

// ── Anketler (ContentAdminDtos.cs) ──────────────────────────────────────────

/** GET /admin/company/surveys liste öğesi (AdminSurveyListItemDto). */
export interface AdminSurveyListItemDto {
  id: string;
  title: string;
  status: ContentStatus;
  singleResponse: boolean;
  questionCount: number;
  responseCount: number;
  publishedAt: IsoDateString | null;
}

/** GET /admin/company/surveys/{id} — sorularla birlikte (AdminSurveyDetailDto). */
export interface AdminSurveyDetailDto {
  id: string;
  title: string;
  status: ContentStatus;
  singleResponse: boolean;
  publishedAt: IsoDateString | null;
  questions: SurveyQuestion[];
}

/** Soru oluştur/güncelle — options single/multi'de zorunlu (SurveyQuestionUpsertRequest). */
export interface SurveyQuestionUpsertRequest {
  order: number;
  type: SurveyQuestionType;
  text: string;
  options: string[] | null;
}

/**
 * Anket oluştur/güncelle (sorular nested) — yayımla/yayımdan kaldır status
 * alanıyla yapılır (SurveyUpsertRequest).
 */
export interface SurveyUpsertRequest {
  title: string;
  singleResponse: boolean;
  status: ContentStatus;
  questions: SurveyQuestionUpsertRequest[];
}

/** Soru bazında yanıt dağılımı: value → seçilme sayısı (SurveyQuestionResultDto). */
export interface SurveyQuestionResultDto {
  questionId: string;
  order: number;
  type: SurveyQuestionType;
  text: string;
  answerCount: number;
  distribution: Record<string, number>;
}

/** GET /admin/company/surveys/{id}/results (SurveyResultsDto). */
export interface SurveyResultsDto {
  surveyId: string;
  title: string;
  responseCount: number;
  questions: SurveyQuestionResultDto[];
}

// ── Duyurular (ContentAdminDtos.cs) ─────────────────────────────────────────

/** Admin duyuru görünümü — boş segmentIds = tenant'taki herkes (AdminAnnouncementDto). */
export interface AdminAnnouncementDto {
  id: string;
  title: string;
  body: string;
  coverUrl: string | null;
  status: ContentStatus;
  publishedAt: IsoDateString | null;
  segmentIds: string[];
}

/** Duyuru oluştur/güncelle — segmentIds null/boş = herkese (AnnouncementUpsertRequest). */
export interface AnnouncementUpsertRequest {
  title: string;
  body: string;
  coverUrl: string | null;
  status: ContentStatus;
  segmentIds: string[] | null;
}

// ── Videolar (ContentAdminDtos.cs) ──────────────────────────────────────────

/** Admin video görünümü (AdminVideoDto). */
export interface AdminVideoDto {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  mandatory: boolean;
}

/** Video oluştur/güncelle isteği (VideoUpsertRequest). */
export interface VideoUpsertRequest {
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  mandatory: boolean;
}

/** İzleme raporu satırı — kullanıcı bazlı durum (VideoWatchReportItemDto). */
export interface VideoWatchReportItemDto {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  watched: boolean;
  progressSeconds: number;
  watchedAt: IsoDateString | null;
}

/** GET /admin/company/videos/{id}/watch-report (VideoWatchReportDto). */
export interface VideoWatchReportDto {
  videoId: string;
  title: string;
  watchedCount: number;
  items: VideoWatchReportItemDto[];
}

// ── Kullanıcılar & segmentler (CompanyAdminDtos.cs) ─────────────────────────
// Not: panels.ts'teki CompanyUser/Segment görünümleri sözleşme taslağına göredir;
// backend'in fiilen döndürdüğü şekil aşağıdaki Dto tipleridir (alan adları birebir).

/** Kullanıcının bağlı olduğu segment özeti (CompanyUserSegmentDto). */
export interface CompanyUserSegmentDto {
  id: string;
  name: string;
}

/** GET /admin/company/users satırı (CompanyUserDto). */
export interface CompanyUserDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  role: string;
  status: 'active' | 'passive';
  segments: CompanyUserSegmentDto[];
}

/**
 * POST /admin/company/users — telefon zorunlu (login OTP anahtarı) ve tenant
 * içinde benzersiz; role null = enduser (CompanyUserCreateRequest).
 */
export interface CompanyUserCreateRequest {
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  segmentIds: string[] | null;
}

/**
 * PUT /admin/company/users/{id} — null alan = değiştirme; status
 * "active|passive" ile aktifleştir/pasifleştir (CompanyUserUpdateRequest).
 */
export interface CompanyUserUpdateRequest {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
}

/** PUT /admin/company/users/{id}/segments — komple değişim (UserSegmentsUpdateRequest). */
export interface UserSegmentsUpdateRequest {
  segmentIds: string[];
}

/** Segment görünümü — kullanıcı sayısı + yetkili modül kodları (CompanySegmentDto). */
export interface CompanySegmentDto {
  id: string;
  name: string;
  userCount: number;
  moduleCodes: string[];
}

/** Segment oluştur/güncelle isteği (SegmentUpsertRequest). */
export interface SegmentUpsertRequest {
  name: string;
}

/** PUT /admin/company/segments/{id}/modules — komple değişim (SegmentModulesUpdateRequest). */
export interface SegmentModulesUpdateRequest {
  moduleCodes: string[];
}
