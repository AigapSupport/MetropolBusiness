/**
 * PANELS_SPEC §A.3 (sadeleştirilmiş) — kullanıcı listesi: server-side sayfalı tablo
 * (GET /admin/company/users ?q&segmentId&status&page), arama + durum/segment filtresi,
 * ekle/düzenle FormDrawer (ad/soyad/telefon/e-posta/rol/segmentler), pasifleştirme
 * onay diyaloğu, segment atama (PUT .../users/{id}/segments).
 */

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CompanyUserCreateRequest,
  CompanyUserDto,
  CompanyUserUpdateRequest,
} from '@shared/content-admin';
import { adminApi } from '../../api/adminApi';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FormDrawer from '../../components/ui/FormDrawer';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/Toast';
import {
  CheckboxField,
  FormField,
  inputStyle,
  linkButtonStyle,
  dangerLinkButtonStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  selectStyle,
} from '../../components/ui/fields';
import { colors, radii } from '../../theme/tokens';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { formatFullName } from '../../utils/format';

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  enduser: 'Kullanıcı',
  approver: 'Onaylayıcı',
  company_admin: 'Firma Admin',
};

interface UserFormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  segmentIds: string[];
}

const EMPTY_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  role: 'enduser',
  segmentIds: [],
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Filtreler: input anlık, arama "Ara"/Enter ile uygulanır (server-side).
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [page, setPage] = useState(1);

  const usersQuery = useQuery({
    queryKey: [
      'company-users',
      { q: appliedSearch, status: statusFilter, segmentId: segmentFilter, page },
    ],
    queryFn: () =>
      adminApi.getUsers({
        q: appliedSearch,
        status: statusFilter,
        segmentId: segmentFilter,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const segmentsQuery = useQuery({
    queryKey: ['company-segments'],
    queryFn: () => adminApi.getSegments(),
  });
  const segments = segmentsQuery.data?.items ?? [];

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: ['company-users'] });
    void queryClient.invalidateQueries({ queryKey: ['company-segments'] });
  };

  // ── Ekle / düzenle drawer ─────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUserDto | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (user: CompanyUserDto) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone,
      email: user.email ?? '',
      role: user.role,
      segmentIds: user.segments.map((segment) => segment.id),
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (request: CompanyUserCreateRequest) => adminApi.createUser(request),
    onSuccess: () => {
      invalidateUsers();
      setDrawerOpen(false);
      showToast('success', 'Kullanıcı eklendi.');
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      update: CompanyUserUpdateRequest;
      segmentIds: string[];
      segmentsChanged: boolean;
    }) => {
      await adminApi.updateUser(input.id, input.update);
      if (input.segmentsChanged) {
        await adminApi.setUserSegments(input.id, { segmentIds: input.segmentIds });
      }
    },
    onSuccess: () => {
      invalidateUsers();
      setDrawerOpen(false);
      showToast('success', 'Kullanıcı güncellendi.');
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    setFormError(null);
    if (editingUser === null && form.phone.trim() === '') {
      setFormError('Telefon zorunludur (giriş anahtarıdır).');
      return;
    }
    if (form.firstName.trim() === '' || form.lastName.trim() === '') {
      setFormError('Ad ve soyad zorunludur.');
      return;
    }

    if (editingUser === null) {
      createMutation.mutate({
        phone: form.phone.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() === '' ? null : form.email.trim(),
        role: form.role,
        segmentIds: form.segmentIds.length > 0 ? form.segmentIds : null,
      });
      return;
    }

    const previousSegmentIds = editingUser.segments.map((segment) => segment.id);
    const segmentsChanged =
      previousSegmentIds.length !== form.segmentIds.length ||
      previousSegmentIds.some((id) => !form.segmentIds.includes(id));

    updateMutation.mutate({
      id: editingUser.id,
      update: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() === '' ? null : form.email.trim(),
        role: form.role,
        status: null,
      },
      segmentIds: form.segmentIds,
      segmentsChanged,
    });
  };

  const toggleFormSegment = (segmentId: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      segmentIds: checked
        ? [...current.segmentIds, segmentId]
        : current.segmentIds.filter((id) => id !== segmentId),
    }));
  };

  // ── Pasifleştir / aktifleştir ─────────────────────────────────────────────
  const [deactivateTarget, setDeactivateTarget] = useState<CompanyUserDto | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => {
      invalidateUsers();
      setDeactivateTarget(null);
      showToast('success', 'Kullanıcı pasifleştirildi.');
    },
    onError: (error) => {
      setDeactivateTarget(null);
      showToast('error', apiErrorMessage(error));
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      adminApi.updateUser(id, {
        firstName: null,
        lastName: null,
        email: null,
        role: null,
        status: 'active',
      }),
    onSuccess: () => {
      invalidateUsers();
      showToast('success', 'Kullanıcı aktifleştirildi.');
    },
    onError: (error) => showToast('error', apiErrorMessage(error)),
  });

  // ── Tablo ────────────────────────────────────────────────────────────────
  const columns: Array<DataTableColumn<CompanyUserDto>> = [
    {
      key: 'name',
      header: 'Ad Soyad',
      render: (user) => (
        <span style={{ fontWeight: 600 }}>{formatFullName(user.firstName, user.lastName)}</span>
      ),
    },
    { key: 'phone', header: 'Telefon', render: (user) => user.phone },
    { key: 'email', header: 'E-posta', render: (user) => user.email ?? '—' },
    {
      key: 'segments',
      header: 'Segmentler',
      render: (user) =>
        user.segments.length === 0 ? (
          '—'
        ) : (
          <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
            {user.segments.map((segment) => (
              <span
                key={segment.id}
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  backgroundColor: colors.neutralBg,
                  color: colors.neutralText,
                }}
              >
                {segment.name}
              </span>
            ))}
          </span>
        ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (user) => ROLE_LABELS[user.role] ?? user.role,
    },
    {
      key: 'status',
      header: 'Durum',
      render: (user) => <StatusBadge status={user.status} />,
    },
    {
      key: 'actions',
      header: '',
      width: 220,
      render: (user) => (
        <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
          <button type="button" style={linkButtonStyle} onClick={() => openEdit(user)}>
            Düzenle
          </button>
          {user.status === 'active' ? (
            <button
              type="button"
              style={dangerLinkButtonStyle}
              onClick={() => setDeactivateTarget(user)}
            >
              Pasifleştir
            </button>
          ) : (
            <button
              type="button"
              style={linkButtonStyle}
              disabled={activateMutation.isPending}
              onClick={() => activateMutation.mutate(user.id)}
            >
              Aktifleştir
            </button>
          )}
        </span>
      ),
    },
  ];

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const data = usersQuery.data;

  return (
    <section>
      <PageHeader
        title="Kullanıcılar"
        description="Firma kullanıcılarını yönetin; segment atayın, pasifleştirin."
        action={
          <button type="button" style={primaryButtonStyle} onClick={openCreate}>
            + Kullanıcı Ekle
          </button>
        }
      />

      {/* FilterBar: arama + segment + durum (PANELS_SPEC §0.2). */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
          padding: 12,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
        }}
      >
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Ad / telefon / e-posta ara"
          style={{ ...inputStyle, width: 260 }}
        />
        <select
          value={segmentFilter}
          onChange={(event) => {
            setSegmentFilter(event.target.value);
            setPage(1);
          }}
          style={{ ...selectStyle, width: 200 }}
        >
          <option value="">Tüm segmentler</option>
          {segments.map((segment) => (
            <option key={segment.id} value={segment.id}>
              {segment.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          style={{ ...selectStyle, width: 160 }}
        >
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
        </select>
        <button type="submit" style={secondaryButtonStyle}>
          Ara
        </button>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={() => {
            setSearchInput('');
            setAppliedSearch('');
            setStatusFilter('');
            setSegmentFilter('');
            setPage(1);
          }}
        >
          Temizle
        </button>
      </form>

      {usersQuery.isError && (
        <p style={{ color: colors.danger, fontSize: 14 }}>
          {apiErrorMessage(usersQuery.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(user) => user.id}
        loading={usersQuery.isPending}
        emptyText="Filtreye uyan kullanıcı yok."
      />

      {data !== undefined && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {/* Ekle/Düzenle FormDrawer */}
      <FormDrawer
        open={drawerOpen}
        title={editingUser === null ? 'Kullanıcı Ekle' : 'Kullanıcı Düzenle'}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSave}
        saving={saving}
      >
        <FormField label="Ad" htmlFor="user-firstName" required>
          <input
            id="user-firstName"
            type="text"
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Soyad" htmlFor="user-lastName" required>
          <input
            id="user-lastName"
            type="text"
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
            style={inputStyle}
          />
        </FormField>
        <FormField
          label="Telefon"
          htmlFor="user-phone"
          required={editingUser === null}
          hint={
            editingUser === null
              ? 'Tenant içinde benzersiz; kullanıcı mobil girişte bu numarayı kullanır.'
              : 'Telefon giriş anahtarıdır; panelden değiştirilemez.'
          }
        >
          <input
            id="user-phone"
            type="tel"
            value={form.phone}
            disabled={editingUser !== null}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="5XXXXXXXXX"
            style={{
              ...inputStyle,
              backgroundColor: editingUser !== null ? colors.disabledBg : colors.surface,
            }}
          />
        </FormField>
        <FormField label="E-posta" htmlFor="user-email">
          <input
            id="user-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Rol" htmlFor="user-role">
          <select
            id="user-role"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
            style={selectStyle}
          >
            <option value="enduser">Kullanıcı</option>
            <option value="approver">Onaylayıcı</option>
          </select>
        </FormField>
        <FormField
          label="Segmentler"
          hint={segments.length === 0 ? 'Henüz segment yok; Segmentler sayfasından oluşturun.' : undefined}
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

      {/* Pasifleştirme onayı (yıkıcı işlem — PANELS_SPEC §0.3). */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        title="Kullanıcıyı pasifleştir"
        message={
          deactivateTarget === null
            ? ''
            : `${formatFullName(deactivateTarget.firstName, deactivateTarget.lastName)} pasifleştirilecek; mobil uygulamaya giriş yapamaz. Devam edilsin mi?`
        }
        confirmLabel="Pasifleştir"
        busy={deactivateMutation.isPending}
        onConfirm={() => {
          if (deactivateTarget !== null) {
            deactivateMutation.mutate(deactivateTarget.id);
          }
        }}
        onCancel={() => setDeactivateTarget(null)}
      />
    </section>
  );
}
