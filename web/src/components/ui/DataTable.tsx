/**
 * Basit yerel DataTable (PANELS_SPEC §0.2 sadeleştirilmiş): kolon tanımı +
 * yükleniyor/boş durumları. Sayfalama server-side'dır, sayfa bileşeni yönetir.
 */

import type { ReactNode } from 'react';
import { colors, radii } from '../../theme/tokens';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: number | string;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyText?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyText = 'Kayıt bulunamadı.',
}: DataTableProps<T>) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ backgroundColor: colors.contentBg }}>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  color: colors.textSecondary,
                  borderBottom: `1px solid ${colors.border}`,
                  width: column.width,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: 24, textAlign: 'center', color: colors.textSecondary }}
              >
                Yükleniyor…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: 24, textAlign: 'center', color: colors.textSecondary }}
              >
                {emptyText}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                      verticalAlign: 'middle',
                    }}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
