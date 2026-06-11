import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { Paged } from '@shared/common';
import type { AdminAnnouncementDto, AnnouncementUpsertRequest } from '@shared/content-admin';
import { api, formatApiError } from '../../api/client';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import {
  errorTextStyle,
  inputStyle,
  labelStyle,
  linkButtonStyle,
  mutedTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  selectStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../components/ui';
import { theme } from '../../theme/tokens';

/** Global duyurular (PANELS_SPEC §B.5): tenant_id=null, tüm firmalarda görünür; segment hedefleme yok. */
export function GlobalContentPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ open: boolean; item: AdminAnnouncementDto | null }>(
    { open: false, item: null },
  );
  const [deleting, setDeleting] = useState<AdminAnnouncementDto | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ['platform', 'announcements', page],
    queryFn: () =>
      api.get<Paged<AdminAnnouncementDto>>(`/platform/announcements?page=${page}&pageSize=20`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/platform/announcements/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'announcements'] });
      setDeleting(null);
    },
  });

  const totalPages = data === undefined ? 1 : Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <section>
      <PageHeader
        title="Global İçerik"
        description="Tüm firmalarda görünen duyurular (tenant ayrımı olmadan)."
      >
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => setEditing({ open: true, item: null })}
        >
          Global Duyuru Oluştur
        </button>
      </PageHeader>

      {isPending && <p style={mutedTextStyle}>Duyurular yükleniyor…</p>}
      {isError && <p style={errorTextStyle}>Duyuru listesi alınamadı; lütfen tekrar deneyin.</p>}

      {data !== undefined && (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Başlık</th>
                <th style={thStyle}>Durum</th>
                <th style={thStyle}>Yayım</th>
                <th style={thStyle}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={4}>
                    <span style={mutedTextStyle}>Global duyuru yok.</span>
                  </td>
                </tr>
              )}
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.title}</td>
                  <td style={tdStyle}>
                    <Badge tone={item.status === 'published' ? 'success' : 'neutral'}>
                      {item.status === 'published' ? 'Yayında' : 'Taslak'}
                    </Badge>
                  </td>
                  <td style={tdStyle}>
                    {item.publishedAt === null
                      ? '—'
                      : new Date(item.publishedAt).toLocaleString('tr-TR')}
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() => setEditing({ open: true, item })}
                    >
                      Düzenle
                    </button>{' '}
                    <button type="button" style={linkButtonStyle} onClick={() => setDeleting(item)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
            <button
              type="button"
              style={secondaryButtonStyle}
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Önceki
            </button>
            <span style={mutedTextStyle}>
              Sayfa {page} / {totalPages}
            </span>
            <button
              type="button"
              style={secondaryButtonStyle}
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Sonraki
            </button>
          </div>
        </>
      )}

      {editing.open && (
        <AnnouncementFormModal
          key={editing.item?.id ?? 'new'}
          item={editing.item}
          onClose={() => setEditing({ open: false, item: null })}
        />
      )}

      {deleting !== null && (
        <ConfirmDialog
          title="Global Duyuruyu Sil"
          message={`"${deleting.title}" duyurusu tüm firmalardan kaldırılacak.`}
          confirmLabel="Sil"
          danger
          busy={deleteMutation.isPending}
          error={deleteMutation.isError ? formatApiError(deleteMutation.error) : null}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          onCancel={() => {
            deleteMutation.reset();
            setDeleting(null);
          }}
        />
      )}
    </section>
  );
}

function AnnouncementFormModal({
  item,
  onClose,
}: {
  item: AdminAnnouncementDto | null;
  onClose: () => void;
}) {
  const isEdit = item !== null;
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [coverUrl, setCoverUrl] = useState(item?.coverUrl ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(
    item?.status === 'published' ? 'published' : 'draft',
  );
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: AnnouncementUpsertRequest) =>
      isEdit
        ? api.put<AdminAnnouncementDto>(`/platform/announcements/${item.id}`, request)
        : api.post<AdminAnnouncementDto>('/platform/announcements', request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'announcements'] });
      onClose();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (title.trim() === '') {
      setFormError('Başlık zorunludur.');
      return;
    }
    setFormError(null);
    mutation.mutate({
      title: title.trim(),
      body,
      coverUrl: coverUrl.trim() === '' ? null : coverUrl.trim(),
      status,
      segmentIds: null, // Global içerikte segment hedefleme yok (PANELS_SPEC B.5).
    });
  }

  const errorMessage = formError ?? (mutation.isError ? formatApiError(mutation.error) : null);

  return (
    <Modal title={isEdit ? 'Duyuru Düzenle' : 'Global Duyuru Oluştur'} onClose={onClose} width={520}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}
      >
        <label style={labelStyle}>
          Başlık
          <input style={inputStyle} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label style={labelStyle}>
          Gövde
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <label style={labelStyle}>
          Kapak görseli URL
          <input
            style={inputStyle}
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
            placeholder="https://…"
          />
        </label>
        <label style={labelStyle}>
          Durum
          <select
            style={selectStyle}
            value={status}
            onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
          </select>
        </label>
        {errorMessage !== null && <p style={errorTextStyle}>{errorMessage}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Vazgeç
          </button>
          <button type="submit" style={primaryButtonStyle} disabled={mutation.isPending}>
            {mutation.isPending ? 'Kaydediliyor…' : isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
