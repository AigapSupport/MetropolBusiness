/**
 * PANELS_SPEC §A.4 — segment listesi + oluştur/düzenle/sil.
 * Silmede segmentte kullanıcı varsa backend VALIDATION_ERROR + details.userCount
 * döner; mesaj kullanıcıya gösterilir.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CompanySegmentDto } from '@shared/content-admin';
import { adminApi } from '../../api/adminApi';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import FormDrawer from '../../components/ui/FormDrawer';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import {
  FormField,
  inputStyle,
  linkButtonStyle,
  dangerLinkButtonStyle,
  primaryButtonStyle,
} from '../../components/ui/fields';
import { colors } from '../../theme/tokens';
import { apiErrorDetailNumber, apiErrorMessage } from '../../utils/apiErrorMessage';

export default function SegmentsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const segmentsQuery = useQuery({
    queryKey: ['company-segments'],
    queryFn: () => adminApi.getSegments(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['company-segments'] });
  };

  // ── Oluştur / düzenle ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<CompanySegmentDto | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingSegment(null);
    setName('');
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (segment: CompanySegmentDto) => {
    setEditingSegment(segment);
    setName(segment.name);
    setFormError(null);
    setDrawerOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (input: { id: string | null; name: string }) =>
      input.id === null
        ? adminApi.createSegment({ name: input.name })
        : adminApi.updateSegment(input.id, { name: input.name }),
    onSuccess: (_segment, input) => {
      invalidate();
      setDrawerOpen(false);
      showToast('success', input.id === null ? 'Segment oluşturuldu.' : 'Segment güncellendi.');
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const handleSave = () => {
    setFormError(null);
    if (name.trim() === '') {
      setFormError('Segment adı zorunludur.');
      return;
    }
    saveMutation.mutate({ id: editingSegment?.id ?? null, name: name.trim() });
  };

  // ── Sil ──────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<CompanySegmentDto | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSegment(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      showToast('success', 'Segment silindi.');
    },
    onError: (error) => {
      setDeleteTarget(null);
      const userCount = apiErrorDetailNumber(error, 'userCount');
      // Kullanıcı varsa backend silmeyi engeller — sayıyla birlikte göster.
      showToast(
        'error',
        userCount !== null
          ? `Segment silinemedi: segmentte ${userCount} kullanıcı var. Önce kullanıcıları başka segmente taşıyın.`
          : apiErrorMessage(error),
      );
    },
  });

  const columns: Array<DataTableColumn<CompanySegmentDto>> = [
    {
      key: 'name',
      header: 'Segment',
      render: (segment) => <span style={{ fontWeight: 600 }}>{segment.name}</span>,
    },
    { key: 'userCount', header: 'Kullanıcı Sayısı', render: (segment) => segment.userCount },
    {
      key: 'modules',
      header: 'Yetkili Modüller',
      render: (segment) =>
        segment.moduleCodes.length === 0 ? '—' : segment.moduleCodes.join(', '),
    },
    {
      key: 'actions',
      header: '',
      width: 160,
      render: (segment) => (
        <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
          <button type="button" style={linkButtonStyle} onClick={() => openEdit(segment)}>
            Düzenle
          </button>
          <button
            type="button"
            style={dangerLinkButtonStyle}
            onClick={() => setDeleteTarget(segment)}
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
        title="Segmentler"
        description="Kullanıcı gruplarını yönetin; modül yetkileri segment bazında verilir."
        action={
          <button type="button" style={primaryButtonStyle} onClick={openCreate}>
            + Segment Oluştur
          </button>
        }
      />

      {segmentsQuery.isError && (
        <p style={{ color: colors.danger, fontSize: 14 }}>
          {apiErrorMessage(segmentsQuery.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={segmentsQuery.data?.items ?? []}
        rowKey={(segment) => segment.id}
        loading={segmentsQuery.isPending}
        emptyText="Henüz segment yok."
      />

      <FormDrawer
        open={drawerOpen}
        title={editingSegment === null ? 'Segment Oluştur' : 'Segment Düzenle'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
        saving={saveMutation.isPending}
      >
        <FormField label="Segment adı" htmlFor="segment-name" required>
          <input
            id="segment-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Örn. Saha Ekibi"
            style={inputStyle}
          />
        </FormField>
        {formError !== null && (
          <p style={{ margin: 0, fontSize: 13, color: colors.danger }}>{formError}</p>
        )}
      </FormDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Segmenti sil"
        message={
          deleteTarget === null
            ? ''
            : `"${deleteTarget.name}" segmenti silinecek. Segmentte kullanıcı varsa silme engellenir. Devam edilsin mi?`
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
