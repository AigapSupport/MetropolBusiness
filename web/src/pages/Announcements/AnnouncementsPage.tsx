/**
 * PANELS_SPEC §A.7 (sadeleştirilmiş) — duyuru listesi + FormDrawer:
 * başlık / gövde / kapak URL / segment hedefleme / yayım durumu.
 * GET/POST/PUT/DELETE /admin/company/announcements.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAnnouncementDto,
  AnnouncementUpsertRequest,
  ContentStatus,
} from '@shared/content-admin';
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
  selectStyle,
} from '../../components/ui/fields';
import { colors } from '../../theme/tokens';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { formatDate } from '../../utils/format';

interface AnnouncementFormState {
  title: string;
  body: string;
  coverUrl: string;
  status: ContentStatus;
  segmentIds: string[];
}

const EMPTY_FORM: AnnouncementFormState = {
  title: '',
  body: '',
  coverUrl: '',
  status: 'draft',
  segmentIds: [],
};

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const announcementsQuery = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => adminApi.getAnnouncements(),
  });

  const segmentsQuery = useQuery({
    queryKey: ['company-segments'],
    queryFn: () => adminApi.getSegments(),
  });
  const segments = segmentsQuery.data?.items ?? [];
  const segmentNameById = new Map(segments.map((segment) => [segment.id, segment.name]));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
  };

  // ── Oluştur / düzenle drawer ─────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAnnouncementDto | null>(null);
  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (announcement: AdminAnnouncementDto) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      body: announcement.body,
      coverUrl: announcement.coverUrl ?? '',
      status: announcement.status,
      segmentIds: [...announcement.segmentIds],
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (input: { id: string | null; request: AnnouncementUpsertRequest }) =>
      input.id === null
        ? adminApi.createAnnouncement(input.request)
        : adminApi.updateAnnouncement(input.id, input.request),
    onSuccess: (_announcement, input) => {
      invalidate();
      setDrawerOpen(false);
      showToast('success', input.id === null ? 'Duyuru oluşturuldu.' : 'Duyuru güncellendi.');
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const handleSave = () => {
    setFormError(null);
    if (form.title.trim() === '') {
      setFormError('Başlık zorunludur.');
      return;
    }
    if (form.body.trim() === '') {
      setFormError('Duyuru gövdesi zorunludur.');
      return;
    }
    saveMutation.mutate({
      id: editing?.id ?? null,
      request: {
        title: form.title.trim(),
        body: form.body.trim(),
        coverUrl: form.coverUrl.trim() === '' ? null : form.coverUrl.trim(),
        status: form.status,
        segmentIds: form.segmentIds.length > 0 ? form.segmentIds : null,
      },
    });
  };

  // ── Hızlı yayım değişimi (satır aksiyonu — tam gövde listeden eldedir). ──
  const publishMutation = useMutation({
    mutationFn: (input: { announcement: AdminAnnouncementDto; status: ContentStatus }) =>
      adminApi.updateAnnouncement(input.announcement.id, {
        title: input.announcement.title,
        body: input.announcement.body,
        coverUrl: input.announcement.coverUrl,
        status: input.status,
        segmentIds:
          input.announcement.segmentIds.length > 0 ? input.announcement.segmentIds : null,
      }),
    onSuccess: (_announcement, input) => {
      invalidate();
      showToast(
        'success',
        input.status === 'published' ? 'Duyuru yayımlandı.' : 'Duyuru yayımdan kaldırıldı.',
      );
    },
    onError: (error) => showToast('error', apiErrorMessage(error)),
  });

  // ── Sil ──────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncementDto | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteAnnouncement(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast('success', 'Duyuru silindi.');
    },
    onError: (error) => {
      setDeleteTarget(null);
      showToast('error', apiErrorMessage(error));
    },
  });

  const toggleFormSegment = (segmentId: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      segmentIds: checked
        ? [...current.segmentIds, segmentId]
        : current.segmentIds.filter((id) => id !== segmentId),
    }));
  };

  const columns: Array<DataTableColumn<AdminAnnouncementDto>> = [
    {
      key: 'title',
      header: 'Başlık',
      render: (announcement) => <span style={{ fontWeight: 600 }}>{announcement.title}</span>,
    },
    {
      key: 'segments',
      header: 'Hedef',
      render: (announcement) =>
        announcement.segmentIds.length === 0
          ? 'Tüm firma'
          : announcement.segmentIds
              .map((id) => segmentNameById.get(id) ?? 'Bilinmeyen segment')
              .join(', '),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (announcement) => <StatusBadge status={announcement.status} />,
    },
    {
      key: 'publishedAt',
      header: 'Yayım Tarihi',
      render: (announcement) => formatDate(announcement.publishedAt),
    },
    {
      key: 'actions',
      header: '',
      width: 260,
      render: (announcement) => (
        <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
          <button type="button" style={linkButtonStyle} onClick={() => openEdit(announcement)}>
            Düzenle
          </button>
          <button
            type="button"
            style={linkButtonStyle}
            disabled={publishMutation.isPending}
            onClick={() =>
              publishMutation.mutate({
                announcement,
                status: announcement.status === 'published' ? 'draft' : 'published',
              })
            }
          >
            {announcement.status === 'published' ? 'Yayımdan Kaldır' : 'Yayımla'}
          </button>
          <button
            type="button"
            style={dangerLinkButtonStyle}
            onClick={() => setDeleteTarget(announcement)}
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
        title="Duyurular"
        description="Firma duyurularını oluşturun; segment hedefleyin ve yayımlayın."
        action={
          <button type="button" style={primaryButtonStyle} onClick={openCreate}>
            + Duyuru Oluştur
          </button>
        }
      />

      {announcementsQuery.isError && (
        <p style={{ color: colors.danger, fontSize: 14 }}>
          {apiErrorMessage(announcementsQuery.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={announcementsQuery.data?.items ?? []}
        rowKey={(announcement) => announcement.id}
        loading={announcementsQuery.isPending}
        emptyText="Henüz duyuru yok."
      />

      <FormDrawer
        open={drawerOpen}
        title={editing === null ? 'Duyuru Oluştur' : 'Duyuru Düzenle'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
        saving={saveMutation.isPending}
        width={480}
      >
        <FormField label="Başlık" htmlFor="announcement-title" required>
          <input
            id="announcement-title"
            type="text"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Gövde" htmlFor="announcement-body" required>
          <textarea
            id="announcement-body"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </FormField>
        <FormField label="Kapak görseli URL" htmlFor="announcement-coverUrl">
          <input
            id="announcement-coverUrl"
            type="url"
            value={form.coverUrl}
            onChange={(event) => setForm({ ...form, coverUrl: event.target.value })}
            placeholder="https://…"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Durum" htmlFor="announcement-status">
          <select
            id="announcement-status"
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value as ContentStatus })
            }
            style={selectStyle}
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
          </select>
        </FormField>
        <FormField
          label="Hedef segmentler"
          hint="Hiçbiri seçilmezse duyuru firmadaki herkese görünür."
        >
          <div>
            {segments.map((segment) => (
              <CheckboxField
                key={segment.id}
                label={segment.name}
                checked={form.segmentIds.includes(segment.id)}
                onChange={(checked) => toggleFormSegment(segment.id, checked)}
              />
            ))}
          </div>
        </FormField>

        {formError !== null && (
          <p style={{ margin: 0, fontSize: 13, color: colors.danger }}>{formError}</p>
        )}
      </FormDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Duyuruyu sil"
        message={
          deleteTarget === null
            ? ''
            : `"${deleteTarget.title}" duyurusu silinecek. Devam edilsin mi?`
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
