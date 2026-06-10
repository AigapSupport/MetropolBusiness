import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import type { Paged } from '@shared/common';
import type { Tenant, TenantStatus } from '@shared/panels';
import { api } from '../../api/client';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { cardStyle, errorTextStyle, mutedTextStyle, tableStyle, tdStyle, thStyle } from '../../components/ui';
import { theme } from '../../theme/tokens';
import { TENANT_STATUS_LABELS, TENANT_STATUS_TONES } from '../Companies/TenantsPage';

const RECENT_LIMIT = 5;

/**
 * Durum başına toplam: liste ucu `total` döndürdüğü için pageSize=1 sorgusu yeterlidir
 * (KPI'lar tenants'tan türetilir; ayrı sayım ucu yok).
 */
function useTenantCount(status: TenantStatus) {
  return useQuery({
    queryKey: ['platform', 'tenants', 'count', status],
    queryFn: () =>
      api.get<Paged<Tenant>>(`/platform/tenants?page=1&pageSize=1&status=${status}`),
    select: (data) => data.total,
  });
}

const kpiValueStyle: CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 700,
  color: theme.colors.textPrimary,
};

function KpiCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div style={{ ...cardStyle, flex: 1, minWidth: 160 }}>
      <p style={{ ...mutedTextStyle, marginBottom: theme.spacing.xs }}>{label}</p>
      <p style={kpiValueStyle}>{value === undefined ? '—' : value}</p>
    </div>
  );
}

/**
 * Dashboard (PANELS_SPEC §B.2, Faz 1 kapsamı): firma KPI'ları (tenants'tan türetilir)
 * + son eklenen firmalar. Kullanıcı/içerik/kampanya KPI'ları Faz 2 backend'iyle gelecek.
 */
export function DashboardPage() {
  const activeCount = useTenantCount('active');
  const passiveCount = useTenantCount('passive');
  const pendingCount = useTenantCount('pending');

  const total =
    activeCount.data !== undefined &&
    passiveCount.data !== undefined &&
    pendingCount.data !== undefined
      ? activeCount.data + passiveCount.data + pendingCount.data
      : undefined;

  // Liste ucu ada göre sıralı döner; "son eklenen" istemcide createdAt'e göre türetilir.
  const recentQuery = useQuery({
    queryKey: ['platform', 'tenants', 'recent'],
    queryFn: () => api.get<Paged<Tenant>>('/platform/tenants?page=1&pageSize=100'),
    select: (data) =>
      [...data.items]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, RECENT_LIMIT),
  });

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Platform geneli firma durumu ve son eklenen firmalar."
      />

      <div
        style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.xl,
          flexWrap: 'wrap',
        }}
      >
        <KpiCard label="Toplam Firma" value={total} />
        <KpiCard label="Aktif" value={activeCount.data} />
        <KpiCard label="Pasif" value={passiveCount.data} />
        <KpiCard label="Bekleyen" value={pendingCount.data} />
      </div>

      <h2 style={{ margin: `0 0 ${theme.spacing.md}px`, fontSize: theme.font.sizeLg }}>
        Son Eklenen Firmalar
      </h2>
      {recentQuery.isPending && <p style={mutedTextStyle}>Firmalar yükleniyor…</p>}
      {recentQuery.isError && (
        <p style={errorTextStyle}>Firma listesi alınamadı; lütfen tekrar deneyin.</p>
      )}
      {recentQuery.data !== undefined && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Ad</th>
              <th style={thStyle}>Kod</th>
              <th style={thStyle}>Durum</th>
              <th style={thStyle}>Oluşturma</th>
            </tr>
          </thead>
          <tbody>
            {recentQuery.data.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={4}>
                  <span style={mutedTextStyle}>Henüz firma eklenmedi.</span>
                </td>
              </tr>
            )}
            {recentQuery.data.map((tenant) => (
              <tr key={tenant.id}>
                <td style={tdStyle}>{tenant.name}</td>
                <td style={tdStyle}>{tenant.code}</td>
                <td style={tdStyle}>
                  <Badge tone={TENANT_STATUS_TONES[tenant.status]}>
                    {TENANT_STATUS_LABELS[tenant.status]}
                  </Badge>
                </td>
                <td style={tdStyle}>
                  {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
