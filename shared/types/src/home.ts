/** docs/API_CONTRACT.md §3 — HOME (ANA SAYFA). */

import type { IsoDateString } from './common';

export type ContentSource = 'company' | 'platform';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  coverUrl: string | null;
  source: ContentSource;
  publishedAt: IsoDateString;
}

export type SurveyQuestionType = 'single' | 'multi' | 'text' | 'rating';

export interface SurveyListItem {
  id: string;
  title: string;
  questionCount: number;
  completed: boolean;
  singleResponse: boolean;
}

export interface SurveyQuestion {
  id: string;
  order: number;
  type: SurveyQuestionType;
  text: string;
  options?: string[];
}

export interface SurveyDetail {
  id: string;
  title: string;
  questions: SurveyQuestion[];
}

export interface SurveyAnswer {
  questionId: string;
  /** single/text/rating: string — multi: string[]. */
  value: string | string[];
}

export interface SurveyResponseRequest {
  answers: SurveyAnswer[];
}

export interface Video {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  mandatory: boolean;
  /** İzleme durumu kullanıcı bazlıdır, backend'de tutulur (PRD §6.5). */
  watched: boolean;
  progressSeconds: number;
}

export interface VideoWatchRequest {
  progressSeconds: number;
  completed: boolean;
}
