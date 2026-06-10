import type { CSSProperties, ReactNode } from 'react';
import { theme } from '../theme/tokens';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONE_COLORS: Record<BadgeTone, string> = {
  success: theme.colors.success,
  warning: theme.colors.warning,
  danger: theme.colors.danger,
  neutral: theme.colors.textSecondary,
};

/** Durum rozeti — kontur + metin aynı ton, dolgu yok (basit-yerel bileşen). */
export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const style: CSSProperties = {
    display: 'inline-block',
    padding: `2px ${theme.spacing.sm}px`,
    borderRadius: theme.radius.sm,
    border: `1px solid ${TONE_COLORS[tone]}`,
    color: TONE_COLORS[tone],
    fontSize: theme.font.sizeSm,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
  return <span style={style}>{children}</span>;
}
