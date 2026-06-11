import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { Paged } from '@shared/common';
import type { AuditLogEntry } from '@shared/panels';
import { api } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import {
  errorTextStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  selectStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../components/ui';
import { theme } from '../../theme/tokens';

/** Bilinen aksiyon slug'ları → Türkçe etiket (yeni aksiyonlar ham slug ile görünür). */
const ACTION_LABELS: Record<string, string> = {
  tenant_created: 'Firma oluşturuldu',
  tenant_status_changed: 'Firma durumu değişti',
  tenant_admin_invited: 'Firma admin davet edildi',
  admin_invite_reset: 'Davet sıfırlandı',
  module_created: 'Modül tanımlandı',
  module_updated: 'Modül güncellendi',
};

/** Denetim kaydı (PANELS_SPEC §B.8): salt-okunur liste + aksiyon filtresi + sayfalama. */
export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const { data, isPending, isError } = useQuery({
    queryKey: ['platform', 'audit-logs', page, action],
    queryFn: () =>
      api.get<Paged<AuditLogEntry>>(
        `/platform/audit-logs?page=${page}&pageSize=20${
          action === '' ? '' : `&action=${encodeURIComponent(action)}`
        }`,
      ),
  });

  const totalPages = data === undefined ? 1 : Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <section>
      <PageHeader
        title="Denetim Kaydı"
        description="Kritik platform olaylarının salt-okunur kaydı (PII içermez)."
      />

      <div style={{ marginBottom: theme.spacing.md }}>
        <select
          style={selectStyle}
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tüm aksiyonlar</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isPending && <p style={mutedTextStyle}>Denetim kaydı yükleniyor…</p>}
      {isError && <p style={errorTextStyle}>Liste alınamadı; lütfen tekrar deneyin.</p>}

      {data !== undefined && (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Zaman</th>
                <th style={thStyle}>Aksiyon</th>
                <th style={thStyle}>Varlık</th>
                <th style={thStyle}>Varlık Id</th>
                <th style={thStyle}>Detay</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={5}>
                    <span style={mutedTextStyle}>Kayıt yok.</span>
                  </td>
                </tr>
              )}
              {data.items.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{new Date(row.createdAt).toLocaleString('tr-TR')}</td>
                  <td style={tdStyle}>{ACTION_LABELS[row.action] ?? row.action}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{row.entity}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                    {row.entityId}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                    {typeof row.metadata === 'string' ? row.metadata : '—'}
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
    </section>
  );
}
