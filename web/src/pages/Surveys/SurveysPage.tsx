/**
 * PANELS_SPEC §A.6 (sadeleştirilmiş) — anket listesi: oluştur/düzenle (ayrı editör
 * sayfası), yayımla/yayımdan kaldır, sonuçlar, sil.
 * Yayım durumu PUT'ta status alanıyla değişir; PUT tam gövde istediği için önce
 * detay çekilir, sorular upsert isteğine eşlenir.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type {
  AdminSurveyListItemDto,
  ContentStatus,
  SurveyUpsertRequest,
} from '@shared/content-admin';
import { adminApi } from '../../api/adminApi';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import {
  linkButtonStyle,
  dangerLinkButtonStyle,
  primaryButtonStyle,
} from '../../components/ui/fields';
import { colors } from '../../theme/tokens';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { formatDate } from '../../utils/format';

export default function SurveysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const surveysQuery = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => adminApi.getSurveys(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
  };

  // ── Yayımla / yayımdan kaldır ────────────────────────────────────────────
  const publishMutation = useMutation({
    mutationFn: async (input: { id: string; status: ContentStatus }) => {
      const detail = await adminApi.getSurvey(input.id);
      const request: SurveyUpsertRequest = {
        title: detail.title,
        singleResponse: detail.singleResponse,
        status: input.status,
        questions: detail.questions.map((question) => ({
          order: question.order,
          type: question.type,
          text: question.text,
          options: question.options ?? null,
        })),
      };
      return adminApi.updateSurvey(input.id, request);
    },
    onSuccess: (_detail, input) => {
      invalidate();
      showToast(
        'success',
        input.status === 'published' ? 'Anket yayımlandı.' : 'Anket yayımdan kaldırıldı.',
      );
    },
    onError: (error) => showToast('error', apiErrorMessage(error)),
  });

  // ── Kopyala ──────────────────────────────────────────────────────────────
  // Detay çekilir, "(Kopya)" ekiyle TASLAK olarak yeni anket oluşturulur.
  const copyMutation = useMutation({
    mutationFn: async (id: string) => {
      const detail = await adminApi.getSurvey(id);
      const request: SurveyUpsertRequest = {
        title: `${detail.title} (Kopya)`,
        singleResponse: detail.singleResponse,
        status: 'draft',
        questions: detail.questions.map((question) => ({
          order: question.order,
          type: question.type,
          text: question.text,
          options: question.options ?? null,
        })),
      };
      return adminApi.createSurvey(request);
    },
    onSuccess: () => {
      invalidate();
      showToast('success', 'Anket taslak olarak kopyalandı.');
    },
    onError: (error) => showToast('error', apiErrorMessage(error)),
  });

  // ── Sil ──────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminSurveyListItemDto | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSurvey(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast('success', 'Anket silindi.');
    },
    onError: (error) => {
      setDeleteTarget(null);
      showToast('error', apiErrorMessage(error));
    },
  });

  const columns: Array<DataTableColumn<AdminSurveyListItemDto>> = [
    {
      key: 'title',
      header: 'Başlık',
      render: (survey) => <span style={{ fontWeight: 600 }}>{survey.title}</span>,
    },
    { key: 'questionCount', header: 'Soru', render: (survey) => survey.questionCount },
    { key: 'responseCount', header: 'Katılım', render: (survey) => survey.responseCount },
    {
      key: 'singleResponse',
      header: 'Tek Seferlik',
      render: (survey) => (survey.singleResponse ? 'Evet' : 'Hayır'),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (survey) => <StatusBadge status={survey.status} />,
    },
    {
      key: 'publishedAt',
      header: 'Yayım Tarihi',
      render: (survey) => formatDate(survey.publishedAt),
    },
    {
      key: 'actions',
      header: '',
      width: 360,
      render: (survey) => (
        <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => navigate(`/content/surveys/${survey.id}`)}
          >
            Düzenle
          </button>
          <button
            type="button"
            style={linkButtonStyle}
            disabled={publishMutation.isPending}
            onClick={() =>
              publishMutation.mutate({
                id: survey.id,
                status: survey.status === 'published' ? 'draft' : 'published',
              })
            }
          >
            {survey.status === 'published' ? 'Yayımdan Kaldır' : 'Yayımla'}
          </button>
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => navigate(`/content/surveys/${survey.id}/results`)}
          >
            Sonuçlar
          </button>
          <button
            type="button"
            style={linkButtonStyle}
            disabled={copyMutation.isPending}
            onClick={() => copyMutation.mutate(survey.id)}
          >
            Kopyala
          </button>
          <button
            type="button"
            style={dangerLinkButtonStyle}
            onClick={() => setDeleteTarget(survey)}
          >
            Sil
          </button>
        </span>
      ),
    },
  ];

  return (
    <section>
      <PageHeader
        title="Anketler"
        description="Firma anketlerini oluşturun, yayımlayın ve sonuçlarını izleyin."
        action={
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => navigate('/content/surveys/new')}
          >
            + Anket Oluştur
          </button>
        }
      />

      {surveysQuery.isError && (
        <p style={{ color: colors.danger, fontSize: 14 }}>
          {apiErrorMessage(surveysQuery.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={surveysQuery.data?.items ?? []}
        rowKey={(survey) => survey.id}
        loading={surveysQuery.isPending}
        emptyText="Henüz anket yok."
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Anketi sil"
        message={
          deleteTarget === null
            ? ''
            : `"${deleteTarget.title}" anketi ve yanıtları silinecek. Devam edilsin mi?`
        }
        confirmLabel="Sil"
        busy={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget !== null) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
