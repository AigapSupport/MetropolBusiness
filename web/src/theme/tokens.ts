/**
 * Tema token'ları — hex renk değerleri YALNIZCA bu dosyada tanımlanır
 * (docs/CLAUDE.md: bileşenlerde renk hardcode edilmez, buradan okunur).
 */

export const colors = {
  /** Marka / birincil aksiyon rengi. */
  primary: '#1f4e9c',
  primaryHover: '#16407f',

  /** Sol sidebar. */
  sidebarBg: '#101828',
  sidebarText: '#cfd5e3',
  sidebarSectionTitle: '#8a93a8',
  sidebarActiveBg: '#1f4e9c',
  sidebarActiveText: '#ffffff',

  /** Üst bar ve yüzeyler. */
  topbarBg: '#ffffff',
  surface: '#ffffff',
  contentBg: '#f5f6fa',
  border: '#e4e7ec',

  /** Metin. */
  textPrimary: '#101828',
  textSecondary: '#667085',
  textOnPrimary: '#ffffff',

  /** Durum renkleri. */
  danger: '#d92d20',
  success: '#12805c',
  warning: '#b54708',
} as const;

export const layout = {
  /** PANELS_SPEC §0.1 — sidebar sabit ~240px, içerik max ~1280px. */
  sidebarWidth: 240,
  contentMaxWidth: 1280,
  topbarHeight: 56,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
} as const;
