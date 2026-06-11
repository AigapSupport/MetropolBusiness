import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { Paged } from '@shared/common';
import type { Tenant, TenantStatus, UpdateTenantRequest } from '@shared/panels';
import { api, formatApiError } from '../../api/client';
import { Badge, type BadgeTone } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import {
  errorTextStyle,
  inputStyle,
  linkButtonStyle,
  mutedTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../components/ui';
import { theme } from '../../theme/tokens';
import { InviteAdminModal } from './InviteAdminModal';
import { TenantFormModal } from './TenantFormModal';

const PAGE_SIZE = 20;

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  active: 'Aktif',
  passive: 'Pasif',
  pending: 'Bekliyor',
};

export const TENANT_STATUS_TONES: Record<TenantStatus, BadgeTone> = {
  active: 'success',
  passive: 'danger',
  pending: 'warning',
};

interface TenantFilters {
  q: string;
  status: TenantStatus | '';
}

function buildTenantsPath(filters: TenantFilters, page: number): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (filters.q !== '') {
    params.set('q', filters.q);
  }
  if (filters.status !== '') {
    params.set('status', filters.status);
  }
  return `/platform/tenants?${params.toString()}`;
}

/** Durum geçişi: aktif → pasif; pasif/bekleyen → aktif (onaylama). */
function nextStatusOf(tenant: Tenant): TenantStatus {
  return tenant.status === 'active' ? 'passive' : 'active';
}

function statusActionLabel(tenant: Tenant): string {
  if (tenant.status === 'active') {
    return 'Pasifleştir';
  }
  return tenant.status === 'pending' ? 'Onayla' : 'Aktifleştir';
}

function statusConfirmMessage(tenant: Tenant): string {
  if (tenant.status === 'active') {
    return `"${tenant.name}" pasifleştirilecek; firmanın tüm kullanıcıları erişimini kaybeder. Devam edilsin mi?`;
  }
  if (tenant.status === 'pending') {
    return `"${tenant.name}" onaylanıp aktifleştirilecek. Devam edilsin mi?`;
  }
  return `"${tenant.name}" yeniden aktifleştirilecek; kullanıcıları tekrar erişim kazanır. Devam edilsin mi?`;
}

/**
 * Firmalar (PANELS_SPEC §B.3): server-side sayfalı/filtreli liste, oluştur/düzenle
 * (marka + canlı önizleme), durum değişimi (onaylı) ve firma admin daveti.
 */
export function TenantsPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<TenantStatus | ''>('');
  const [filters, setFilters] = useState<TenantFilters>({ q: '', status: '' });
  const [page, setPage] = useState(1);

  const [formState, setFormState] = useState<{ open: boolean; tenant: Tenant | null }>({
    open: false,
    tenant: null,
  });
  const [inviteTenant, setInviteTenant] = useState<Tenant | null>(null);
  const [statusTenant, setStatusTenant] = useState<Tenant | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ['platform', 'tenants', 'list', filters.q, filters.status, page],
    queryFn: () => api.get<Paged<Tenant>>(buildTenantsPath(filters, page)),
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TenantStatus }) => {
      const request: UpdateTenantRequest = { status };
      return api.put<Tenant>(`/platform/tenants/${id}`, request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      setStatusTenant(null);
    },
  });

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFilters({ q: searchInput.trim(), status: statusInput });
    setPage(1);
  }

  const totalPages = data !== undefined ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section>
      <PageHeader
        title="Firmalar"
        description="Platforma kayıtlı firmalar (tenant): oluşturma, marka ayarı, durum ve firma admin daveti."
      >
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => setFormState({ open: true, tenant: null })}
        >
          Firma Ekle
        </button>
      </PageHeader>

      {/* FilterBar: ad/kod araması + durum (server-side). */}
      <form
        onSubmit={handleFilterSubmit}
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
          alignItems: 'center',
        }}
      >
        <input
          style={{ ...inputStyle, width: 260 }}
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Ad veya kod ara…"
          aria-label="Firma ara"
        />
        <select
          style={inputStyle}
          value={statusInput}
          onChange={(event) => setStatusInput(event.target.value as TenantStatus | '')}
          aria-label="Durum filtresi"
        >
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
          <option value="pending">Bekliyor</option>
        </select>
        <button type="submit" style={secondaryButtonStyle}>
          Filtrele
        </button>
      </form>

      {isPending && <p style={mutedTextStyle}>Firmalar yükleniyor…</p>}
      {isError && <p style={errorTextStyle}>Firma listesi alınamadı; lütfen tekrar deneyin.</p>}

      {data !== undefined && (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Ad</th>
                <th style={thStyle}>Kod</th>
                <th style={thStyle}>Durum</th>
                <th style={thStyle}>Kullanıcı</th>
                <th style={thStyle}>Metropol Eşleşmesi</th>
                <th style={thStyle}>Oluşturma</th>
                <th style={thStyle}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={7}>
                    <span style={mutedTextStyle}>Kayıtlı firma bulunamadı.</span>
                  </td>
                </tr>
              )}
              {data.items.map((tenant) => (
                <tr key={tenant.id}>
                  <td style={tdStyle}>{tenant.name}</td>
                  <td style={tdStyle}>{tenant.code}</td>
                  <td style={tdStyle}>
                    <Badge tone={TENANT_STATUS_TONES[tenant.status]}>
                      {TENANT_STATUS_LABELS[tenant.status]}
                    </Badge>
                  </td>
                  <td style={tdStyle}>{tenant.userCount}</td>
                  <td style={tdStyle}>
                    {/* Backend yalnız VARLIK bilgisini döner; sır consumer ref değeri gelmez. */}
                    {tenant.hasMetropolConsumer ? (
                      <Badge tone="success">Var</Badge>
                    ) : (
                      <Badge tone="warning">Yok</Badge>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                      <button
                        type="button"
                        style={linkButtonStyle}
                        onClick={() => setFormState({ open: true, tenant })}
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        style={{
                          ...linkButtonStyle,
                          color:
                            tenant.status === 'active'
                              ? theme.colors.danger
                              : theme.colors.success,
                        }}
                        onClick={() => setStatusTenant(tenant)}
                      >
                        {statusActionLabel(tenant)}
                      </button>
                      <button
                        type="button"
                        style={linkButtonStyle}
                        onClick={() => setInviteTenant(tenant)}
                      >
                        Admin Davet Et
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sayfalama (server-side). */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginTop: theme.spacing.md,
            }}
          >
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Önceki
            </button>
            <span style={mutedTextStyle}>
              Sayfa {page} / {totalPages} · Toplam {data.total} firma
            </span>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              Sonraki
            </button>
          </div>
        </>
      )}

      {formState.open && (
        <TenantFormModal
          key={formState.tenant?.id ?? 'new'}
          tenant={formState.tenant}
          onClose={() => setFormState({ open: false, tenant: null })}
        />
      )}

      {inviteTenant !== null && (
        <InviteAdminModal
          key={inviteTenant.id}
          tenant={inviteTenant}
          onClose={() => setInviteTenant(null)}
        />
      )}

      {statusTenant !== null && (
        <ConfirmDialog
          title="Durum değişikliği"
          message={statusConfirmMessage(statusTenant)}
          confirmLabel={statusActionLabel(statusTenant)}
          danger={statusTenant.status === 'active'}
          busy={statusMutation.isPending}
          error={statusMutation.isError ? formatApiError(statusMutation.error) : null}
          onConfirm={() =>
            statusMutation.mutate({ id: statusTenant.id, status: nextStatusOf(statusTenant) })
          }
          onCancel={() => {
            statusMutation.reset();
            setStatusTenant(null);
          }}
        />
      )}
    </section>
  );
}
