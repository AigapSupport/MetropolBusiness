/**
 * PANELS_SPEC §A.5 (alternatif görünüm) — segment seçilir, o segmentin modülleri
 * toggle listesi olarak yönetilir (PUT /admin/company/segments/{id}/modules).
 *
 * Not: Firma admin için modül kataloğu ucu yok (GET /platform/modules yalnız
 * platform_admin). Toggle listesi, bilinen modül tanımları + tenant segmentlerinde
 * halihazırda atanmış kodların birleşiminden kurulur; bilinmeyen kodlar kod adıyla
 * gösterilir. Backend tanımsız/pasif kodu zaten VALIDATION_ERROR ile reddeder.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/adminApi';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { primaryButtonStyle, selectStyle } from '../../components/ui/fields';
import { colors, radii } from '../../theme/tokens';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

/** Bilinen modül tanımları (infra/scripts/seed.sql ile aynı kodlar). */
const KNOWN_MODULE_LABELS: Record<string, string> = {
  leave_request: 'İzin Talebi',
  expense_request: 'Masraf Talebi',
  expense_approval: 'Masraf Onay',
};

export default function ModulePermissionsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const segmentsQuery = useQuery({
    queryKey: ['company-segments'],
    queryFn: () => adminApi.getSegments(),
  });
  const segments = useMemo(
    () => segmentsQuery.data?.items ?? [],
    [segmentsQuery.data],
  );

  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId) ?? null;

  // Katalog: bilinen kodlar ∪ segmentlerde geçen kodlar (alfabetik, stabil).
  const moduleCatalog = useMemo(() => {
    const codes = new Set<string>(Object.keys(KNOWN_MODULE_LABELS));
    for (const segment of segments) {
      for (const code of segment.moduleCodes) {
        codes.add(code);
      }
    }
    return [...codes].sort();
  }, [segments]);

  // Seçili segmentin taslak toggle durumu; segment değişince sunucu verisinden başlar.
  const [draftCodes, setDraftCodes] = useState<string[] | null>(null);
  const effectiveCodes = draftCodes ?? selectedSegment?.moduleCodes ?? [];

  const handleSegmentChange = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    setDraftCodes(null);
  };

  const toggleCode = (code: string, enabled: boolean) => {
    const next = enabled
      ? [...effectiveCodes, code]
      : effectiveCodes.filter((existing) => existing !== code);
    setDraftCodes(next);
  };

  const saveMutation = useMutation({
    mutationFn: (input: { segmentId: string; moduleCodes: string[] }) =>
      adminApi.setSegmentModules(input.segmentId, { moduleCodes: input.moduleCodes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-segments'] });
      setDraftCodes(null);
      // Değişiklik kullanıcıya bir sonraki GET /me/modules çağrısında yansır (A.5 kabul).
      showToast('success', 'Modül yetkileri kaydedildi.');
    },
    onError: (error) => showToast('error', apiErrorMessage(error)),
  });

  const hasChanges =
    draftCodes !== null &&
    selectedSegment !== null &&
    (draftCodes.length !== selectedSegment.moduleCodes.length ||
      draftCodes.some((code) => !selectedSegment.moduleCodes.includes(code)));

  return (
    <section>
      <PageHeader
        title="Modül Yetkileri"
        description="Segment seçin; o segmentin erişebildiği modülleri açıp kapatın. Yetki kontrolü backend'de de uygulanır."
      />

      {segmentsQuery.isError && (
        <p style={{ color: colors.danger, fontSize: 14 }}>
          {apiErrorMessage(segmentsQuery.error)}
        </p>
      )}

      <div
        style={{
          padding: 20,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          maxWidth: 560,
        }}
      >
        <label
          htmlFor="segment-select"
          style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 13,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          Segment
        </label>
        <select
          id="segment-select"
          value={selectedSegmentId}
          onChange={(event) => handleSegmentChange(event.target.value)}
          style={{ ...selectStyle, maxWidth: 320 }}
        >
          <option value="">Segment seçin…</option>
          {segments.map((segment) => (
            <option key={segment.id} value={segment.id}>
              {segment.name} ({segment.userCount} kullanıcı)
            </option>
          ))}
        </select>

        {segmentsQuery.isPending && (
          <p style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary }}>Yükleniyor…</p>
        )}

        {selectedSegment !== null && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {moduleCatalog.map((code) => {
                const enabled = effectiveCodes.includes(code);
                return (
                  <label
                    key={code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 14px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: radii.md,
                      fontSize: 14,
                      color: colors.textPrimary,
                    }}
                  >
                    <span>
                      {KNOWN_MODULE_LABELS[code] ?? code}
                      <span style={{ marginLeft: 8, fontSize: 12, color: colors.textSecondary }}>
                        ({code})
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => toggleCode(code, event.target.checked)}
                    />
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!hasChanges || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  segmentId: selectedSegment.id,
                  moduleCodes: effectiveCodes,
                })
              }
              style={{
                ...primaryButtonStyle,
                marginTop: 16,
                backgroundColor:
                  !hasChanges || saveMutation.isPending ? colors.disabledBg : colors.primary,
                color:
                  !hasChanges || saveMutation.isPending
                    ? colors.textSecondary
                    : colors.textOnPrimary,
              }}
            >
              {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
