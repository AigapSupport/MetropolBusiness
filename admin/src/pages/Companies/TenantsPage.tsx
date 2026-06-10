import { useQuery } from '@tanstack/react-query';
import type { Paged } from '@shared/common';
import type { Tenant } from '@shared/panels';
import { api } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { theme } from '../../theme/tokens';

const TENANT_STATUS_LABELS: Record<Tenant['status'], string> = {
  active: 'Aktif',
  passive: 'Pasif',
  pending: 'Bekliyor',
};

/** PANELS_SPEC.md §B.3 — Firmalar (tenant) listesi. */
export function TenantsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => api.get<Paged<Tenant>>('/platform/tenants'),
  });

  return (
    <section>
      <PageHeader
        title="Firmalar"
        description="Platforma kayıtlı firmalar (tenant). Oluşturma/düzenleme ve firma admin daveti Faz 1'de."
      />
      {isPending && (
        <p style={{ color: theme.colors.textSecondary }}>Firmalar yükleniyor…</p>
      )}
      {isError && (
        <p style={{ color: theme.colors.danger }}>
          Firma listesi alınamadı. Backend hazır olduğunda bu liste dolacak.
        </p>
      )}
      {data !== undefined && (
        <ul style={{ paddingLeft: theme.spacing.lg, color: theme.colors.textPrimary }}>
          {data.items.map((tenant) => (
            <li key={tenant.id}>
              {tenant.name} ({tenant.code}) — {TENANT_STATUS_LABELS[tenant.status]} ·{' '}
              {tenant.userCount} kullanıcı
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
