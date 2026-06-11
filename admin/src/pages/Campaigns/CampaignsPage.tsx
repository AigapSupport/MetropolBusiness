import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { AdminCampaign, AdminCategory, CampaignUpsertRequest } from '@shared/benefits-admin';
import type { Paged } from '@shared/common';
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

/** Avantajlar Dünyası kampanyaları (PANELS_SPEC §B.6) — global, tüm firmalarda görünür. */
export function CampaignsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryCode, setCategoryCode] = useState('');
  const [editing, setEditing] = useState<{ open: boolean; campaign: AdminCampaign | null }>(
    { open: false, campaign: null },
  );
  const [deleting, setDeleting] = useState<AdminCampaign | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['platform', 'campaign-categories'],
    queryFn: () => api.get<{ items: AdminCategory[] }>('/platform/campaign-categories'),
  });

  const campaignsQuery = useQuery({
    queryKey: ['platform', 'campaigns', page, categoryCode],
    queryFn: () =>
      api.get<Paged<AdminCampaign>>(
        `/platform/campaigns?page=${page}&pageSize=20${
          categoryCode === '' ? '' : `&categoryCode=${encodeURIComponent(categoryCode)}`
        }`,
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/platform/campaigns/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'campaigns'] });
      setDeleting(null);
    },
  });

  const totalPages = campaignsQuery.data === undefined
    ? 1
    : Math.max(1, Math.ceil(campaignsQuery.data.total / campaignsQuery.data.pageSize));

  return (
    <section>
      <PageHeader
        title="Kampanyalar"
        description="Avantajlar Dünyası — tüm firmalarda görünen global kampanyalar."
      >
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => setEditing({ open: true, campaign: null })}
        >
          Kampanya Oluştur
        </button>
      </PageHeader>

      <div style={{ marginBottom: theme.spacing.md }}>
        <select
          style={selectStyle}
          value={categoryCode}
          onChange={(event) => {
            setCategoryCode(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm kategoriler</option>
          {(categoriesQuery.data?.items ?? []).map((category) => (
            <option key={category.id} value={category.code}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {campaignsQuery.isPending && <p style={mutedTextStyle}>Kampanyalar yükleniyor…</p>}
      {campaignsQuery.isError && (
        <p style={errorTextStyle}>Kampanya listesi alınamadı; lütfen tekrar deneyin.</p>
      )}

      {campaignsQuery.data !== undefined && (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Başlık</th>
                <th style={thStyle}>Kategori</th>
                <th style={thStyle}>Durum</th>
                <th style={thStyle}>Yayım</th>
                <th style={thStyle}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {campaignsQuery.data.items.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    <span style={mutedTextStyle}>Kampanya yok.</span>
                  </td>
                </tr>
              )}
              {campaignsQuery.data.items.map((campaign) => (
                <tr key={campaign.id}>
                  <td style={tdStyle}>{campaign.title}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{campaign.categoryCode}</td>
                  <td style={tdStyle}>
                    <Badge tone={campaign.status === 'published' ? 'success' : 'neutral'}>
                      {campaign.status === 'published' ? 'Yayında' : 'Taslak'}
                    </Badge>
                  </td>
                  <td style={tdStyle}>
                    {campaign.publishedAt === null
                      ? '—'
                      : new Date(campaign.publishedAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() => setEditing({ open: true, campaign })}
                    >
                      Düzenle
                    </button>{' '}
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() => setDeleting(campaign)}
                    >
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
        <CampaignFormModal
          key={editing.campaign?.id ?? 'new'}
          campaign={editing.campaign}
          categories={categoriesQuery.data?.items ?? []}
          onClose={() => setEditing({ open: false, campaign: null })}
        />
      )}

      {deleting !== null && (
        <ConfirmDialog
          title="Kampanyayı Sil"
          message={`"${deleting.title}" kampanyası tüm firmalardan kaldırılacak.`}
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

function CampaignFormModal({
  campaign,
  categories,
  onClose,
}: {
  campaign: AdminCampaign | null;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const isEdit = campaign !== null;
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(campaign?.categoryId ?? categories[0]?.id ?? '');
  const [title, setTitle] = useState(campaign?.title ?? '');
  const [body, setBody] = useState(campaign?.body ?? '');
  const [brandLogoUrl, setBrandLogoUrl] = useState(campaign?.brandLogoUrl ?? '');
  const [detailUrl, setDetailUrl] = useState(campaign?.detailUrl ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>(campaign?.status ?? 'draft');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: CampaignUpsertRequest) =>
      isEdit
        ? api.put<AdminCampaign>(`/platform/campaigns/${campaign.id}`, request)
        : api.post<AdminCampaign>('/platform/campaigns', request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'campaigns'] });
      onClose();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (categoryId === '' || title.trim() === '') {
      setFormError('Kategori ve başlık zorunludur.');
      return;
    }
    setFormError(null);
    mutation.mutate({
      categoryId,
      title: title.trim(),
      body,
      brandLogoUrl: brandLogoUrl.trim() === '' ? null : brandLogoUrl.trim(),
      detailUrl: detailUrl.trim() === '' ? null : detailUrl.trim(),
      status,
    });
  }

  const errorMessage = formError ?? (mutation.isError ? formatApiError(mutation.error) : null);

  return (
    <Modal title={isEdit ? 'Kampanya Düzenle' : 'Kampanya Oluştur'} onClose={onClose} width={520}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}
      >
        <label style={labelStyle}>
          Kategori
          <select
            style={selectStyle}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Başlık
          <input style={inputStyle} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label style={labelStyle}>
          Gövde
          <textarea
            style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <label style={labelStyle}>
          Marka logosu URL
          <input
            style={inputStyle}
            value={brandLogoUrl}
            onChange={(event) => setBrandLogoUrl(event.target.value)}
            placeholder="https://…"
          />
        </label>
        <label style={labelStyle}>
          Detay linki ("Detaylı Bilgi Al")
          <input
            style={inputStyle}
            value={detailUrl}
            onChange={(event) => setDetailUrl(event.target.value)}
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
