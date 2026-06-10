/**
 * Admin (platform) panel tema token'ları.
 * Renk değerleri YALNIZCA bu dosyada tanımlanır; bileşenlerde hex hardcode edilmez (CLAUDE.md §7).
 * Admin paneli platform kimliğini taşır — tenant white-label temasından bağımsızdır.
 */

export const theme = {
  colors: {
    /** Platform ana rengi (koyu lacivert). */
    primary: '#1B2A4A',
    primaryHover: '#24375F',
    /** Vurgu rengi (turkuaz). */
    accent: '#0FA3B1',
    background: '#F4F6FA',
    surface: '#FFFFFF',
    sidebarBg: '#101C33',
    sidebarText: '#C7D0E0',
    sidebarActiveBg: '#24375F',
    sidebarActiveText: '#FFFFFF',
    textPrimary: '#16202E',
    textSecondary: '#5A6678',
    border: '#DDE3EC',
    danger: '#C0392B',
    success: '#1E8449',
    warning: '#B9770E',
    /** Modal/diyalog arkaplan karartması. */
    overlay: 'rgba(16, 28, 51, 0.55)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 16,
  },
  font: {
    family:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    sizeSm: 13,
    sizeMd: 15,
    sizeLg: 18,
    sizeXl: 24,
  },
} as const;

export type Theme = typeof theme;
