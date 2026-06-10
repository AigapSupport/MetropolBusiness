/**
 * Tema token tipleri ve marka-bağımsız temel değerler.
 * Kaynak referans: design/prototype theme.jsx > T (PROTOTYPE_MAP §1).
 * Ekranlarda renk hex'i hardcode edilmez; her şey useTheme() üzerinden okunur.
 */

/** Bir tenant'ın (firmanın) marka paleti — white-label birimi. */
export interface BrandPalette {
  /** Firma görünen adı (white-label) */
  name: string;
  brand: string;
  brandDark: string;
  brandSoft: string;
}

export interface ColorTokens {
  /** Aktif tenant marka renkleri */
  brand: string;
  brandDark: string;
  brandSoft: string;
  /** Nötr / yapısal renkler */
  navy: string;
  navySoft: string;
  bg: string;
  card: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  line2: string;
  /** Durum renkleri */
  success: string;
  successSoft: string;
  danger: string;
}

export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface RadiusTokens {
  sm: number;
  md: number;
  lg: number;
}

export interface FontSizeTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  fontSize: FontSizeTokens;
}

/** Marka bağımsız nötr renkler (prototip T karşılığı). */
export const neutralColors: Omit<ColorTokens, 'brand' | 'brandDark' | 'brandSoft'> = {
  navy: '#2D2A5A',
  navySoft: '#EAE9F2',
  bg: '#F4F4F7',
  card: '#FFFFFF',
  ink: '#1C1B2E',
  ink2: '#6E6D7E',
  ink3: '#A6A5B3',
  line: 'rgba(45,42,90,0.10)',
  line2: 'rgba(45,42,90,0.06)',
  success: '#2E9E6B',
  successSoft: '#E7F5EE',
  danger: '#E04E63',
};

/** Renk dışındaki ölçü token'ları (prototip radius değerleriyle uyumlu). */
export const baseTokens: Omit<ThemeTokens, 'colors'> = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 20, xl: 28 },
  radius: { sm: 12, md: 18, lg: 24 },
  fontSize: { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 },
};
