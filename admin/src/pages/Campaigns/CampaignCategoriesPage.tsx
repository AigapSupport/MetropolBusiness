import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { AdminCategory, CategoryUpsertRequest } from '@shared/benefits-admin';
import { api, formatApiError } from '../../api/client';
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
  tableStyle,
  tdStyle,
  thStyle,
} from '../../components/ui';
import { theme } from '../../theme/tokens';

/** Kampanya kategorileri (PANELS_SPEC §B.7): kod, ad, sıra; kampanyası olan silinemez. */
export function CampaignCategoriesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ open: boolean; category: AdminCategory | null }>(
    { open: false, category: null },
  );
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ['platform', 'campaign-categories'],
    queryFn: () => api.get<{ items: AdminCategory[] }>('/platform/campaign-categories'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/platform/campaign-categories/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'campaign-categories'] });
      setDeleting(null);
    },
  });

  return (
    <section>
      <PageHeader
        title="Kategoriler"
        description="Kampanya kategorileri — mobil Yan Haklar grid'i bu listeden beslenir."
      >
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => setEditing({ open: true, category: null })}
        >
          Kategori Oluştur
        </button>
      </PageHeader>

      {isPending && <p style={mutedTextStyle}>Kategoriler yükleniyor…</p>}
      {isError && <p style={errorTextStyle}>Kategori listesi alınamadı; lütfen tekrar deneyin.</p>}

      {data !== undefined && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Sıra</th>
              <th style={thStyle}>Kod</th>
              <th style={thStyle}>Ad</th>
              <th style={thStyle}>Kampanya</th>
              <th style={thStyle}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={5}>
                  <span style={mutedTextStyle}>Kategori yok. İlk kategoriyi oluşturun.</span>
                </td>
              </tr>
            )}
            {data.items.map((category) => (
              <tr key={category.id}>
                <td style={tdStyle}>{category.sortOrder}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{category.code}</td>
                <td style={tdStyle}>{category.name}</td>
                <td style={tdStyle}>{category.campaignCount}</td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    style={linkButtonStyle}
                    onClick={() => setEditing({ open: true, category })}
                  >
                    Düzenle
                  </button>{' '}
                  <button
                    type="button"
                    style={linkButtonStyle}
                    onClick={() => setDeleting(category)}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing.open && (
        <CategoryFormModal
          key={editing.category?.id ?? 'new'}
          category={editing.category}
          onClose={() => setEditing({ open: false, category: null })}
        />
      )}

      {deleting !== null && (
        <ConfirmDialog
          title="Kategoriyi Sil"
          message={`"${deleting.name}" kategorisi silinecek. Kampanyası olan kategori silinemez.`}
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

function CategoryFormModal({
  category,
  onClose,
}: {
  category: AdminCategory | null;
  onClose: () => void;
}) {
  const isEdit = category !== null;
  const queryClient = useQueryClient();
  const [code, setCode] = useState(category?.code ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (request: CategoryUpsertRequest) =>
      isEdit
        ? api.put<AdminCategory>(`/platform/campaign-categories/${category.id}`, request)
        : api.post<AdminCategory>('/platform/campaign-categories', request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'campaign-categories'] });
      onClose();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (code.trim() === '' || name.trim() === '') {
      setFormError('Kod ve ad zorunludur.');
      return;
    }
    setFormError(null);
    mutation.mutate({ code: code.trim(), name: name.trim(), sortOrder: Number(sortOrder) || 0 });
  }

  const errorMessage = formError ?? (mutation.isError ? formatApiError(mutation.error) : null);

  return (
    <Modal title={isEdit ? 'Kategori Düzenle' : 'Kategori Oluştur'} onClose={onClose} width={420}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}
      >
        <label style={labelStyle}>
          Kod (slug, benzersiz)
          <input
            style={inputStyle}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="campaigns"
          />
        </label>
        <label style={labelStyle}>
          Ad
          <input
            style={inputStyle}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Kampanyalar"
          />
        </label>
        <label style={labelStyle}>
          Sıra
          <input
            style={inputStyle}
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
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
