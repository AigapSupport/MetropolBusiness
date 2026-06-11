/**
 * PANELS_SPEC §A.8 (sadeleştirilmiş) — video listesi + FormDrawer
 * (başlık/açıklama/URL/thumbnail/süre/zorunlu) + izlenme raporu tablosu.
 * GET/POST/PUT/DELETE /admin/company/videos + GET .../videos/{id}/watch-report.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminVideoDto, VideoUpsertRequest } from '@shared/content-admin';
import { adminApi } from '../../api/adminApi';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import {
  CheckboxField,
  FormField,
  inputStyle,
  linkButtonStyle,
  dangerLinkButtonStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../../components/ui/fields';
import { colors, radii } from '../../theme/tokens';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatDuration, formatFullName } from '../../utils/format';

interface VideoFormState {
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  durationText: string;
  mandatory: boolean;
}

const EMPTY_FORM: VideoFormState = {
  title: '',
  description: '',
  url: '',
  thumbnailUrl: '',
  durationText: '',
  mandatory: false,
};

export default function VideosPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const videosQuery = useQuery({
    queryKey: ['admin-videos'],
    queryFn: () => adminApi.getVideos(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
  };

  // ── Oluştur / düzenle drawer ─────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminVideoDto | null>(null);
  const [form, setForm] = useState<VideoFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (video: AdminVideoDto) => {
    setEditing(video);
    setForm({
      title: video.title,
      description: video.description ?? '',
      url: video.url,
      thumbnailUrl: video.thumbnailUrl ?? '',
      durationText: String(video.durationSeconds),
      mandatory: video.mandatory,
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (input: { id: string | null; request: VideoUpsertRequest }) =>
      input.id === null
        ? adminApi.createVideo(input.request)
        : adminApi.updateVideo(input.id, input.request),
    onSuccess: (_video, input) => {
      invalidate();
      setDrawerOpen(false);
      showToast('success', input.id === null ? 'Video eklendi.' : 'Video güncellendi.');
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const handleSave = () => {
    setFormError(null);
    if (form.title.trim() === '') {
      setFormError('Başlık zorunludur.');
      return;
    }
    if (form.url.trim() === '') {
      setFormError('Video URL zorunludur.');
      return;
    }
    const durationSeconds = Number.parseInt(form.durationText, 10);
    if (Number.isNaN(durationSeconds) || durationSeconds <= 0) {
      setFormError('Süre saniye cinsinden pozitif bir sayı olmalıdır.');
      return;
    }
    saveMutation.mutate({
      id: editing?.id ?? null,
      request: {
        title: form.title.trim(),
        description: form.description.trim() === '' ? null : form.description.trim(),
        url: form.url.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() === '' ? null : form.thumbnailUrl.trim(),
        durationSeconds,
        mandatory: form.mandatory,
      },
    });
  };

  // ── Sil ──────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminVideoDto | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteVideo(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast('success', 'Video silindi.');
    },
    onError: (error) => {
      setDeleteTarget(null);
      showToast('error', apiErrorMessage(error));
    },
  });

  // ── İzlenme raporu ───────────────────────────────────────────────────────
  const [reportVideoId, setReportVideoId] = useState<string | null>(null);

  const reportQuery = useQuery({
    queryKey: ['admin-video-watch-report', reportVideoId],
    queryFn: () => adminApi.getVideoWatchReport(reportVideoId ?? ''),
    enabled: reportVideoId !== null,
  });

  const columns: Array<DataTableColumn<AdminVideoDto>> = [
    {
      key: 'title',
      header: 'Başlık',
      render: (video) => <span style={{ fontWeight: 600 }}>{video.title}</span>,
    },
    {
      key: 'duration',
      header: 'Süre',
      render: (video) => formatDuration(video.durationSeconds),
    },
    {
      key: 'mandatory',
      header: 'Zorunlu',
      render: (video) =>
        video.mandatory ? <StatusBadge status="mandatory" /> : <span>—</span>,
    },
    {
      key: 'url',
      header: 'URL',
      render: (video) => (
        <span
          style={{
            display: 'inline-block',
            maxWidth: 240,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            verticalAlign: 'bottom',
            color: colors.textSecondary,
          }}
        >
          {video.url}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 260,
      render: (video) => (
        <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
          <button type="button" style={linkButtonStyle} onClick={() => openEdit(video)}>
            Düzenle
          </button>
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => setReportVideoId(video.id)}
          >
            İzlenme Raporu
          </button>
          <button
            type="button"
            style={dangerLinkButtonStyle}
            onClick={() => setDeleteTarget(video)}
          >
            Sil
          </button>
        </span>
      ),
    },
  ];

  const report = reportQuery.data;

  /** İzlenme raporunu mevcut veriden istemci tarafında CSV'ye döker. */
  const handleDownloadReportCsv = () => {
    if (report === undefined) {
      return;
    }
    const rows: string[][] = [['Kullanıcı', 'İzledi', 'İlerleme (sn)', 'İzlenme Tarihi']];
    for (const item of report.items) {
      rows.push([
        formatFullName(item.firstName, item.lastName),
        item.watched ? 'Evet' : 'Hayır',
        String(item.progressSeconds),
        item.watchedAt ?? '',
      ]);
    }
    downloadCsv(`video-izlenme-${report.videoId}.csv`, rows);
  };

  return (
    <section>
      <PageHeader
        title="Videolar"
        description="Eğitim videolarını yönetin; kullanıcı bazlı izlenme durumunu görün."
        action={
          <button type="button" style={primaryButtonStyle} onClick={openCreate}>
            + Video Ekle
          </button>
        }
      />

      {videosQuery.isError && (
        <p style={{ color: colors.danger, fontSize: 14 }}>
          {apiErrorMessage(videosQuery.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={videosQuery.data?.items ?? []}
        rowKey={(video) => video.id}
        loading={videosQuery.isPending}
        emptyText="Henüz video yok."
      />

      {/* İzlenme raporu paneli (GET .../watch-report). */}
      {reportVideoId !== null && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 16, color: colors.textPrimary }}>
              İzlenme Raporu
              {report !== undefined && ` — ${report.title} (${report.watchedCount} izleyen)`}
            </h2>
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <button
                type="button"
                style={{
                  ...secondaryButtonStyle,
                  color: report === undefined ? colors.textSecondary : colors.textPrimary,
                }}
                disabled={report === undefined}
                onClick={handleDownloadReportCsv}
              >
                CSV İndir
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => setReportVideoId(null)}
              >
                Kapat
              </button>
            </span>
          </div>

          {reportQuery.isPending && (
            <p style={{ fontSize: 14, color: colors.textSecondary }}>Rapor yükleniyor…</p>
          )}
          {reportQuery.isError && (
            <p style={{ fontSize: 14, color: colors.danger }}>
              {apiErrorMessage(reportQuery.error)}
            </p>
          )}

          {report !== undefined && (
            <DataTable
              columns={[
                {
                  key: 'user',
                  header: 'Kullanıcı',
                  render: (item) => formatFullName(item.firstName, item.lastName),
                },
                {
                  key: 'watched',
                  header: 'Durum',
                  render: (item) => (
                    <StatusBadge status={item.watched ? 'watched' : 'notWatched'} />
                  ),
                },
                {
                  key: 'progress',
                  header: 'İlerleme',
                  render: (item) => formatDuration(item.progressSeconds),
                },
                {
                  key: 'watchedAt',
                  header: 'İzlenme Tarihi',
                  render: (item) => formatDate(item.watchedAt),
                },
              ]}
              rows={report.items}
              rowKey={(item) => item.userId}
              emptyText="Bu video için izleme kaydı yok."
            />
          )}
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        title={editing === null ? 'Video Ekle' : 'Video Düzenle'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
        saving={saveMutation.isPending}
        width={480}
      >
        <FormField label="Başlık" htmlFor="video-title" required>
          <input
            id="video-title"
            type="text"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Açıklama" htmlFor="video-description">
          <textarea
            id="video-description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </FormField>
        <FormField label="Video URL" htmlFor="video-url" required>
          <input
            id="video-url"
            type="url"
            value={form.url}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
            placeholder="https://…"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Thumbnail URL" htmlFor="video-thumbnailUrl">
          <input
            id="video-thumbnailUrl"
            type="url"
            value={form.thumbnailUrl}
            onChange={(event) => setForm({ ...form, thumbnailUrl: event.target.value })}
            placeholder="https://…"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Süre (saniye)" htmlFor="video-duration" required>
          <input
            id="video-duration"
            type="number"
            min={1}
            value={form.durationText}
            onChange={(event) => setForm({ ...form, durationText: event.target.value })}
            placeholder="Örn. 300"
            style={inputStyle}
          />
        </FormField>
        <CheckboxField
          label="Zorunlu izleme"
          checked={form.mandatory}
          onChange={(mandatory) => setForm({ ...form, mandatory })}
        />

        {formError !== null && (
          <p style={{ margin: 0, fontSize: 13, color: colors.danger }}>{formError}</p>
        )}
      </FormDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Videoyu sil"
        message={
          deleteTarget === null
            ? ''
            : `"${deleteTarget.title}" videosu silinecek. Devam edilsin mi?`
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
