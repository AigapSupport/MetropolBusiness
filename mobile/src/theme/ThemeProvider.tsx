/**
 * Tema context'i — white-label marka paletini runtime'da uygular.
 * Prototipteki app.setBrandKey(k) davranışının RN karşılığı.
 * Faz 1.10: brandKey/palet backend'den (tenant branding) yüklenecek.
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_BRAND_KEY, PALETTES } from './palettes';
import type { BrandKey } from './palettes';
import { baseTokens, neutralColors } from './tokens';
import type { ThemeTokens } from './tokens';

interface ThemeContextValue {
  theme: ThemeTokens;
  brandKey: BrandKey;
  /** Tenant temasını runtime'da değiştirir (white-label). */
  setBrandKey: (key: BrandKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTheme(brandKey: BrandKey): ThemeTokens {
  const palette = PALETTES[brandKey];
  return {
    ...baseTokens,
    colors: {
      ...neutralColors,
      brand: palette.brand,
      brandDark: palette.brandDark,
      brandSoft: palette.brandSoft,
    },
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [brandKey, setBrandKey] = useState<BrandKey>(DEFAULT_BRAND_KEY);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: buildTheme(brandKey), brandKey, setBrandKey }),
    [brandKey],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır');
  }
  return context;
}
