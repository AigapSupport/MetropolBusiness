import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Paged } from '@shared/common';
import type { ExpenseRequest, LeaveRequest } from '@shared/modules';
import { api } from '../../api/client';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { colors } from '../../theme/tokens';

type RequestTab = 'leave' | 'expense';
type StatusFilter = '' | 'pending' | 'approved' | 'rejected';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

/**
 * Talepler (PANELS_SPEC §A.9): firma admin GENEL görünümü — salt liste.
 * Onay yetkisi approver'dadır (mobil Masraf Onay ekranı); burada karar verilmez.
 */
export default function RequestsPage() {
  const [tab, setTab] = useState<RequestTab>('expense');
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

  const query = `page=${page}&pageSize=20${status === '' ? '' : `&status=${status}`}`;

  const leaveQuery = useQuery({
    queryKey: ['company', 'leave-requests', page, status],
    queryFn: () => api.get<Paged<LeaveRequest>>(`/admin/company/leave-requests?${query}`),
    enabled: tab === 'leave',
  });

  const expenseQuery = useQuery({
    queryKey: ['company', 'expense-requests', page, status],
    queryFn: () => api.get<Paged<ExpenseRequest>>(`/admin/company/expense-requests?${query}`),
    enabled: tab === 'expense',
  });

  const leaveColumns: Array<DataTableColumn<LeaveRequest>> = [
    { key: 'type', header: 'Tip', render: (row) => row.type },
    {
      key: 'range',
      header: 'Tarih Aralığı',
      render: (row) => `${row.startDate} → ${row.endDate}`,
    },
    { key: 'days', header: 'Gün', render: (row) => row.days },
    {
      key: 'status',
      header: 'Durum',
      render: (row) => (
        <StatusBadge
          status={row.status}
          tone={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}
          label={STATUS_LABELS[row.status] ?? row.status}
        />
      ),
    },
    {
      key: 'decided',
      header: 'Karar',
      render: (row) =>
        row.decidedAt === null ? '—' : new Date(row.decidedAt).toLocaleDateString('tr-TR'),
    },
  ];

  const expenseColumns: Array<DataTableColumn<ExpenseRequest>> = [
    { key: 'requester', header: 'Talep Eden', render: (row) => row.requesterName ?? '—' },
    { key: 'type', header: 'Tip', render: (row) => row.type },
    { key: 'amount', header: 'Tutar', render: (row) => `${row.amount} ₺` },
    { key: 'date', header: 'Tarih', render: (row) => row.date },
    {
      key: 'receipt',
      header: 'Fiş',
      render: (row) =>
        row.receiptUrl === null ? (
          '—'
        ) : (
          <a href={row.receiptUrl} target="_blank" rel="noreferrer">
            Görüntüle
          </a>
        ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (row) => (
        <StatusBadge
          status={row.status}
          tone={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}
          label={STATUS_LABELS[row.status] ?? row.status}
        />
      ),
    },
  ];

  const active = tab === 'leave' ? leaveQuery : expenseQuery;

  const tabButton = (value: RequestTab, label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(value);
        setPage(1);
      }}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderBottom: `2px solid ${tab === value ? colors.primary : 'transparent'}`,
        backgroundColor: 'transparent',
        color: tab === value ? colors.primary : colors.textSecondary,
        fontWeight: tab === value ? 600 : 400,
        fontSize: 14,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <section>
      <PageHeader
        title="Talepler"
        description="İzin ve masraf taleplerinin firma geneli görünümü; onay yetkisi onaylayıcılardadır."
      />

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
        {tabButton('expense', 'Masraf Talepleri')}
        {tabButton('leave', 'İzin Talepleri')}
      </div>

      <div style={{ marginBottom: 12 }}>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: 14,
          }}
        >
          <option value="">Tüm durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="approved">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
        </select>
      </div>

      {active.isError && (
        <p style={{ color: colors.danger, fontSize: 14 }}>Liste alınamadı; lütfen tekrar deneyin.</p>
      )}

      {tab === 'leave' ? (
        <DataTable
          columns={leaveColumns}
          rows={leaveQuery.data?.items ?? []}
          rowKey={(row) => row.id}
          loading={leaveQuery.isPending}
          emptyText="İzin talebi yok."
        />
      ) : (
        <DataTable
          columns={expenseColumns}
          rows={expenseQuery.data?.items ?? []}
          rowKey={(row) => row.id}
          loading={expenseQuery.isPending}
          emptyText="Masraf talebi yok."
        />
      )}

      {active.data !== undefined && (
        <Pagination
          page={active.data.page}
          pageSize={active.data.pageSize}
          total={active.data.total}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
