import type { BrandPalette } from './tokens';

/**
 * Örnek marka paletleri — design/prototype app.jsx > PALETTES'in birebir karşılığı.
 * NOT: Gerçek tenant teması Faz 1.10'da backend'den runtime yüklenecek (white-label);
 * bu sabitler yalnızca geliştirme/önizleme içindir, build-time marka seçimi DEĞİLDİR.
 */
export const PALETTES = {
  coral: { name: 'Nova Holding', brand: '#F2697B', brandDark: '#E04E63', brandSoft: '#FDEEF1' },
  blue: { name: 'Atlas Enerji', brand: '#2F7DD6', brandDark: '#2367B8', brandSoft: '#EAF2FC' },
  green: { name: 'Vera Sağlık', brand: '#2E9E6B', brandDark: '#248255', brandSoft: '#E7F5EE' },
  purple: { name: 'Lumen Teknoloji', brand: '#6E54C8', brandDark: '#5B43AD', brandSoft: '#EFEBFA' },
} satisfies Record<string, BrandPalette>;

export type BrandKey = keyof typeof PALETTES;

export const DEFAULT_BRAND_KEY: BrandKey = 'coral';
