/**
 * PANELS_SPEC §A.3 (sadeleştirilmiş) — kullanıcı listesi: server-side sayfalı tablo
 * (GET /admin/company/users ?q&segmentId&status&page), arama + durum/segment filtresi,
 * ekle/düzenle FormDrawer (ad/soyad/telefon/e-posta/rol/segmentler), pasifleştirme
 * onay diyaloğu, segment atama (PUT .../users/{id}/segments).
 * Konfor: CSV ile toplu içe aktarma (önizleme + satır bazlı sonuç raporu) ve
 * satır seçimiyle toplu segment atama (PUT segments sırayla, sonuç özeti).
 */

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
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
import { parseCsv } from '../../utils/csv';
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

// ── CSV toplu içe aktarma (PANELS_SPEC §A.3 "Toplu İçe Aktar (CSV)") ─────────

/** CSV önizleme/sonuç satırı — `error` istemci doğrulaması, `serverError` POST sonucu. */
interface ImportRow {
  /** Dosyadaki satır numarası (başlık 1. satır olduğundan 2'den başlar). */
  line: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  /** İstemci doğrulama hatası — null ise satır aktarılabilir. */
  error: string | null;
  /** POST create başarılı oldu. */
  imported: boolean;
  /** POST create hata mesajı (örn. telefon çakışması VALIDATION_ERROR). */
  serverError: string | null;
}

interface ParsedImport {
  rows: ImportRow[];
  /** Dosya düzeyi hata (boş dosya, eksik başlık) — varsa rows boştur. */
  fileError: string | null;
}

/**
 * CSV metnini içe aktarma satırlarına çevirir. Başlık satırı zorunlu:
 * firstName,lastName,phone[,email,role] — büyük/küçük harf toleranslı,
 * sütun sırası serbest (ada göre eşlenir). Ayraç , veya ; olabilir (parseCsv).
 */
function parseImportRows(text: string): ParsedImport {
  const csv = parseCsv(text);
  if (csv.length === 0) {
    return { rows: [], fileError: 'Dosya boş.' };
  }

  const header = csv[0].map((cell) => cell.trim().toLowerCase());
  const columnIndex = (name: string) => header.indexOf(name.toLowerCase());
  const firstNameIdx = columnIndex('firstName');
  const lastNameIdx = columnIndex('lastName');
  const phoneIdx = columnIndex('phone');
  const emailIdx = columnIndex('email');
  const roleIdx = columnIndex('role');

  if (firstNameIdx === -1 || lastNameIdx === -1 || phoneIdx === -1) {
    return {
      rows: [],
      fileError:
        'Başlık satırı eksik veya hatalı; beklenen sütunlar: firstName, lastName, phone, email, role.',
    };
  }
  if (csv.length === 1) {
    return { rows: [], fileError: 'Dosyada veri satırı yok.' };
  }

  const seenPhones = new Set<string>();
  const rows = csv.slice(1).map((cells, index): ImportRow => {
    const at = (idx: number): string =>
      idx === -1 || idx >= cells.length ? '' : cells[idx].trim();
    const firstName = at(firstNameIdx);
    const lastName = at(lastNameIdx);
    const phone = at(phoneIdx);
    const email = at(emailIdx);
    const roleRaw = at(roleIdx).toLowerCase();
    const role = roleRaw === '' ? 'enduser' : roleRaw;

    let error: string | null = null;
    if (firstName === '' || lastName === '') {
      error = 'Ad ve soyad zorunludur.';
    } else if (phone === '') {
      error = 'Telefon zorunludur.';
    } else if (role !== 'enduser' && role !== 'approver') {
      error = "Geçersiz rol; 'enduser' veya 'approver' olmalıdır.";
    } else if (seenPhones.has(phone)) {
      error = 'Telefon dosya içinde mükerrer.';
    }
    if (phone !== '') {
      seenPhones.add(phone);
    }

    return {
      line: index + 2,
      firstName,
      lastName,
      phone,
      email,
      role,
      error,
      imported: false,
      serverError: null,
    };
  });

  return { rows, fileError: null };
}

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

  // ── CSV toplu içe aktarma ────────────────────────────────────────────────
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importFileError, setImportFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  const importableCount = importRows.filter(
    (row) => row.error === null && !row.imported,
  ).length;
  const importInvalidCount = importRows.filter((row) => row.error !== null).length;

  const handleImportFile = async (file: File) => {
    setImportSummary(null);
    try {
      const text = await file.text();
      const parsed = parseImportRows(text);
      setImportRows(parsed.rows);
      setImportFileError(parsed.fileError);
    } catch {
      setImportRows([]);
      setImportFileError('Dosya okunamadı.');
    }
    setImportOpen(true);
  };

  const handleImportInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Aynı dosya tekrar seçilebilsin diye input sıfırlanır.
    event.target.value = '';
    if (file !== undefined) {
      void handleImportFile(file);
    }
  };

  /** Geçerli satırları sırayla POST eder; satır bazlı sonuç tabloya işlenir. */
  const runImport = async () => {
    setImporting(true);
    let success = 0;
    let failed = 0;
    const next: ImportRow[] = [];
    for (const row of importRows) {
      if (row.error !== null || row.imported) {
        next.push(row);
        continue;
      }
      try {
        await adminApi.createUser({
          phone: row.phone,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email === '' ? null : row.email,
          role: row.role,
          segmentIds: null,
        });
        next.push({ ...row, imported: true, serverError: null });
        success += 1;
      } catch (error) {
        // Örn. telefon çakışması VALIDATION_ERROR — mesaj satırda gösterilir.
        next.push({ ...row, serverError: apiErrorMessage(error) });
        failed += 1;
      }
    }
    setImportRows(next);
    setImportSummary({ success, failed });
    setImporting(false);
    invalidateUsers();
    showToast(
      failed === 0 ? 'success' : 'error',
      `İçe aktarma tamamlandı: ${success} başarılı, ${failed} hatalı.`,
    );
  };

  const handleImportSubmit = () => {
    if (importing) {
      return;
    }
    // Aktarma bittiyse veya aktarılabilir satır yoksa birincil düğme kapatır.
    if (importSummary !== null || importableCount === 0) {
      setImportOpen(false);
      return;
    }
    void runImport();
  };

  const importColumns: Array<DataTableColumn<ImportRow>> = [
    { key: 'line', header: 'Satır', width: 56, render: (row) => row.line },
    { key: 'firstName', header: 'Ad', render: (row) => row.firstName },
    { key: 'lastName', header: 'Soyad', render: (row) => row.lastName },
    { key: 'phone', header: 'Telefon', render: (row) => row.phone },
    { key: 'email', header: 'E-posta', render: (row) => (row.email === '' ? '—' : row.email) },
    { key: 'role', header: 'Rol', render: (row) => ROLE_LABELS[row.role] ?? row.role },
    {
      key: 'status',
      header: 'Durum',
      render: (row) =>
        row.error !== null ? (
          <span style={{ color: colors.danger, fontSize: 12 }}>Geçersiz: {row.error}</span>
        ) : row.imported ? (
          <span style={{ color: colors.success, fontSize: 12 }}>Eklendi</span>
        ) : row.serverError !== null ? (
          <span style={{ color: colors.danger, fontSize: 12 }}>Hata: {row.serverError}</span>
        ) : (
          <span style={{ color: colors.textSecondary, fontSize: 12 }}>Hazır</span>
        ),
    },
  ];

  // ── Toplu segment atama (satır seçimi) ───────────────────────────────────
  const [selectedUsers, setSelectedUsers] = useState<Record<string, CompanyUserDto>>({});
  const selectedCount = Object.keys(selectedUsers).length;

  const pageUsers = usersQuery.data?.items ?? [];
  const allPageSelected =
    pageUsers.length > 0 && pageUsers.every((user) => selectedUsers[user.id] !== undefined);

  const toggleUserSelected = (user: CompanyUserDto, checked: boolean) => {
    setSelectedUsers((current) => {
      const next = { ...current };
      if (checked) {
        next[user.id] = user;
      } else {
        delete next[user.id];
      }
      return next;
    });
  };

  const togglePageSelection = (checked: boolean) => {
    setSelectedUsers((current) => {
      const next = { ...current };
      for (const user of pageUsers) {
        if (checked) {
          next[user.id] = user;
        } else {
          delete next[user.id];
        }
      }
      return next;
    });
  };

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSegmentIds, setBulkSegmentIds] = useState<string[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const toggleBulkSegment = (segmentId: string, checked: boolean) => {
    setBulkSegmentIds((current) =>
      checked ? [...current, segmentId] : current.filter((id) => id !== segmentId),
    );
  };

  /**
   * Seçili kullanıcılara sırayla PUT .../segments atar. Atama birleşimdir:
   * kullanıcının mevcut segmentleri korunur, seçilen segmentler eklenir.
   */
  const runBulkAssign = async () => {
    if (bulkSegmentIds.length === 0) {
      setBulkError('En az bir segment seçin.');
      return;
    }
    setBulkError(null);
    setBulkAssigning(true);
    let success = 0;
    let failed = 0;
    let firstErrorMessage = '';
    const remaining: Record<string, CompanyUserDto> = {};
    for (const user of Object.values(selectedUsers)) {
      const merged = Array.from(
        new Set([...user.segments.map((segment) => segment.id), ...bulkSegmentIds]),
      );
      try {
        await adminApi.setUserSegments(user.id, { segmentIds: merged });
        success += 1;
      } catch (error) {
        failed += 1;
        if (firstErrorMessage === '') {
          firstErrorMessage = apiErrorMessage(error);
        }
        remaining[user.id] = user; // hatalı kullanıcılar seçili bırakılır
      }
    }
    setBulkAssigning(false);
    setBulkOpen(false);
    setSelectedUsers(remaining);
    invalidateUsers();
    showToast(
      failed === 0 ? 'success' : 'error',
      failed === 0
        ? `${success} kullanıcıya segment atandı.`
        : `Segment atama: ${success} başarılı, ${failed} hatalı (${firstErrorMessage}). Hatalı kullanıcılar seçili bırakıldı.`,
    );
  };

  // ── Tablo ────────────────────────────────────────────────────────────────
  const columns: Array<DataTableColumn<CompanyUserDto>> = [
    {
      key: 'select',
      header: '',
      width: 36,
      render: (user) => (
        <input
          type="checkbox"
          aria-label={`${formatFullName(user.firstName, user.lastName)} seç`}
          checked={selectedUsers[user.id] !== undefined}
          onChange={(event) => toggleUserSelected(user, event.target.checked)}
        />
      ),
    },
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
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleImportInputChange}
            />
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => importFileInputRef.current?.click()}
            >
              Toplu İçe Aktar (CSV)
            </button>
            <button type="button" style={primaryButtonStyle} onClick={openCreate}>
              + Kullanıcı Ekle
            </button>
          </span>
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

      {/* Toplu işlem çubuğu: sayfa seçimi + seçililere segment atama. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: colors.textPrimary,
          }}
        >
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={(event) => togglePageSelection(event.target.checked)}
          />
          Sayfadakileri seç
        </label>
        <span style={{ fontSize: 13, color: colors.textSecondary }}>
          Seçili: {selectedCount}
        </span>
        <button
          type="button"
          style={{
            ...secondaryButtonStyle,
            color: selectedCount === 0 ? colors.textSecondary : colors.textPrimary,
          }}
          disabled={selectedCount === 0}
          onClick={() => {
            setBulkSegmentIds([]);
            setBulkError(null);
            setBulkOpen(true);
          }}
        >
          Seçililere Segment Ata
        </button>
        {selectedCount > 0 && (
          <button type="button" style={linkButtonStyle} onClick={() => setSelectedUsers({})}>
            Seçimi temizle
          </button>
        )}
      </div>

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

      {/* CSV içe aktarma: önizleme + satır bazlı sonuç raporu. */}
      <FormDrawer
        open={importOpen}
        title="Toplu İçe Aktar (CSV)"
        width={720}
        onClose={() => {
          if (!importing) {
            setImportOpen(false);
          }
        }}
        onSubmit={handleImportSubmit}
        saving={importing}
        submitLabel={
          importSummary !== null || importableCount === 0
            ? 'Kapat'
            : `Aktar (${importableCount})`
        }
      >
        {importFileError !== null ? (
          <p style={{ margin: 0, fontSize: 13, color: colors.danger }}>{importFileError}</p>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.textSecondary }}>
              Beklenen başlık satırı: firstName, lastName, phone, email, role (virgül veya
              noktalı virgül ayraçlı). Aktarılabilir satır: {importableCount} /{' '}
              {importRows.length}
              {importInvalidCount > 0 && ` — ${importInvalidCount} geçersiz satır atlanacak`}
              .
            </p>
            {importSummary !== null && (
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 13,
                  color: importSummary.failed === 0 ? colors.success : colors.danger,
                }}
              >
                Aktarma tamamlandı: {importSummary.success} başarılı,{' '}
                {importSummary.failed} hatalı
                {importInvalidCount > 0 && `, ${importInvalidCount} geçersiz satır atlandı`}.
                Hata mesajları satırların Durum sütunundadır.
              </p>
            )}
            <DataTable
              columns={importColumns}
              rows={importRows}
              rowKey={(row) => String(row.line)}
              emptyText="Dosyada veri satırı yok."
            />
          </>
        )}
      </FormDrawer>

      {/* Toplu segment atama: seçili kullanıcılara sırayla PUT .../segments. */}
      <FormDrawer
        open={bulkOpen}
        title="Seçililere Segment Ata"
        onClose={() => {
          if (!bulkAssigning) {
            setBulkOpen(false);
          }
        }}
        onSubmit={() => {
          void runBulkAssign();
        }}
        saving={bulkAssigning}
        submitLabel={`Ata (${selectedCount} kullanıcı)`}
      >
        <FormField
          label="Eklenecek segmentler"
          hint={
            segments.length === 0
              ? 'Henüz segment yok; Segmentler sayfasından oluşturun.'
              : 'Seçilen segmentler kullanıcıların mevcut segmentlerine eklenir (mevcutlar korunur).'
          }
        >
          <div>
            {segments.map((segment) => (
              <CheckboxField
                key={segment.id}
                label={segment.name}
                checked={bulkSegmentIds.includes(segment.id)}
                onChange={(checked) => toggleBulkSegment(segment.id, checked)}
              />
            ))}
          </div>
        </FormField>

        {bulkError !== null && (
          <p style={{ margin: 0, fontSize: 13, color: colors.danger }}>{bulkError}</p>
        )}
      </FormDrawer>
    </section>
  );
}
