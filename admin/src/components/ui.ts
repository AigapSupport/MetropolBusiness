/**
 * Ortak, basit-yerel UI stil sözlüğü (kütüphanesiz).
 * Renkler YALNIZCA tema token'larından gelir (CLAUDE.md §7).
 */

import type { CSSProperties } from 'react';
import { theme } from '../theme/tokens';

export const inputStyle: CSSProperties = {
  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.colors.border}`,
  fontSize: theme.font.sizeMd,
  background: theme.colors.surface,
  color: theme.colors.textPrimary,
};

export const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xs,
  fontSize: theme.font.sizeSm,
  color: theme.colors.textSecondary,
};

export const primaryButtonStyle: CSSProperties = {
  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  borderRadius: theme.radius.sm,
  border: 'none',
  background: theme.colors.primary,
  color: theme.colors.surface,
  fontSize: theme.font.sizeMd,
  fontWeight: 600,
  cursor: 'pointer',
};

export const secondaryButtonStyle: CSSProperties = {
  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.colors.border}`,
  background: theme.colors.surface,
  color: theme.colors.textPrimary,
  fontSize: theme.font.sizeMd,
  cursor: 'pointer',
};

export const dangerButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: theme.colors.danger,
};

/** Tablo satır aksiyonları için küçük metin-buton. */
export const linkButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: theme.colors.accent,
  fontSize: theme.font.sizeSm,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
};

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: theme.colors.surface,
  borderRadius: theme.radius.md,
  overflow: 'hidden',
};

export const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  fontSize: theme.font.sizeSm,
  color: theme.colors.textSecondary,
  borderBottom: `1px solid ${theme.colors.border}`,
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
  fontSize: theme.font.sizeMd,
  color: theme.colors.textPrimary,
  borderBottom: `1px solid ${theme.colors.border}`,
  verticalAlign: 'middle',
};

export const cardStyle: CSSProperties = {
  background: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.md,
  padding: theme.spacing.md,
};

export const errorTextStyle: CSSProperties = {
  margin: 0,
  fontSize: theme.font.sizeSm,
  color: theme.colors.danger,
};

export const mutedTextStyle: CSSProperties = {
  margin: 0,
  fontSize: theme.font.sizeSm,
  color: theme.colors.textSecondary,
};
