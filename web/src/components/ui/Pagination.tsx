/** Server-side sayfalama kontrolü (API_CONTRACT §0.4 zarfı ile). */

import { colors, radii } from '../../theme/tokens';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buttonStyle = (disabled: boolean) => ({
    padding: '6px 12px',
    borderRadius: radii.md,
    border: `1px solid ${colors.border}`,
    backgroundColor: disabled ? colors.disabledBg : colors.surface,
    color: disabled ? colors.textSecondary : colors.textPrimary,
    fontSize: 13,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
      }}
    >
      <span style={{ fontSize: 13, color: colors.textSecondary }}>
        Toplam {total} kayıt · Sayfa {page}/{totalPages}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={buttonStyle(page <= 1)}
        >
          ← Önceki
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={buttonStyle(page >= totalPages)}
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
}
