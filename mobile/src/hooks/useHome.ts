/**
 * Ana Sayfa içerik hook'ları (React Query) — docs/API_CONTRACT.md §3.
 * Mutation'lar ilgili listeleri invalidate eder: anket gönderimi → anket listesi
 * (completed rozeti güncellenir), video izleme → video listesi (izlendi durumu).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorCodes } from '@shared/common';
import type { SurveyResponseRequest, VideoWatchRequest } from '@shared/home';

import { ApiError } from '@/api/client';
import { homeApi } from '@/api/home';

/** Query anahtarları — invalidation prefix eşleşmesiyle çalışır (['home','surveys'] detayları da kapsar). */
export const homeKeys = {
  announcements: ['home', 'announcements'] as const,
  announcement: (id: string) => ['home', 'announcements', id] as const,
  surveys: ['home', 'surveys'] as const,
  survey: (id: string) => ['home', 'surveys', id] as const,
  videos: ['home', 'videos'] as const,
};

/** GET /home/announcements — ilk sayfa, carousel için yeterli (firma + global). */
export function useAnnouncements() {
  return useQuery({
    queryKey: homeKeys.announcements,
    queryFn: () => homeApi.getAnnouncements(),
  });
}

/** GET /home/announcements/{id} — duyuru detayı. */
export function useAnnouncementDetail(id: string) {
  return useQuery({
    queryKey: homeKeys.announcement(id),
    queryFn: () => homeApi.getAnnouncement(id),
  });
}

/** GET /home/surveys — completed bayrağı kullanıcıya özeldir. */
export function useSurveys() {
  return useQuery({
    queryKey: homeKeys.surveys,
    queryFn: () => homeApi.getSurveys(),
  });
}

/** GET /home/surveys/{id} — sorularla birlikte anket detayı. */
export function useSurveyDetail(id: string) {
  return useQuery({
    queryKey: homeKeys.survey(id),
    queryFn: () => homeApi.getSurveyDetail(id),
  });
}

/**
 * POST /home/surveys/{id}/responses — başarıda anket listesi yenilenir (completed rozeti).
 * 409 SURVEY_ALREADY_ANSWERED'da da yenilenir: liste bayatlamıştır (başka cihazdan yanıtlanmış olabilir).
 */
export function useSubmitSurvey(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SurveyResponseRequest) =>
      homeApi.submitSurveyResponse(surveyId, request),
    onSettled: (_data, error) => {
      if (error === null || isSurveyAlreadyAnsweredError(error)) {
        void queryClient.invalidateQueries({ queryKey: homeKeys.surveys });
      }
    },
  });
}

/** GET /home/videos — izlendi/ilerleme kullanıcı bazlı, backend'de tutulur (PRD §6.5). */
export function useVideos() {
  return useQuery({
    queryKey: homeKeys.videos,
    queryFn: () => homeApi.getVideos(),
  });
}

/** POST /home/videos/{id}/watch — başarıda video listesi yenilenir (izlendi rozeti). */
export function useWatchVideo(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: VideoWatchRequest) => homeApi.watchVideo(videoId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: homeKeys.videos });
    },
  });
}

/** 409 SURVEY_ALREADY_ANSWERED mı? Anket ekranı özel mesaj gösterir (PRD §6.5). */
export function isSurveyAlreadyAnsweredError(error: unknown): boolean {
  return error instanceof ApiError && error.error.code === ErrorCodes.SurveyAlreadyAnswered;
}
