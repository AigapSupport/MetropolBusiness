/**
 * Tema context'i — white-label marka paletini runtime'da uygular (TODO 1.10).
 * Öncelik: sunucudan gelen tenant branding'i (GET /me → tenant.branding);
 * yoksa statik PALETTES fallback'i (geliştirme/önizleme). Prototipteki
 * app.setBrandKey(k) davranışının RN karşılığı.
 *
 * brandDark/brandSoft sunucudan gelmez; primaryColor'dan türetilir (color.ts).
 * secondaryColor yapısal navy token'ını override eder (tenant ikincil rengi).
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { TenantBranding } from '@shared/me';

import { darkenHex, lightenHex } from './color';
import { DEFAULT_BRAND_KEY, PALETTES } from './palettes';
import type { BrandKey } from './palettes';
import { baseTokens, neutralColors } from './tokens';
import type { ThemeTokens } from './tokens';

interface ThemeContextValue {
  theme: ThemeTokens;
  brandKey: BrandKey;
  /** Statik fallback paleti değiştirir (yalnızca sunucu branding'i yokken etkili). */
  setBrandKey: (key: BrandKey) => void;
  /** GET /me yanıtındaki tenant.branding'i uygular; null → statik fallback'e dönülür. */
  setServerBranding: (branding: TenantBranding | null) => void;
  /** Tenant logosu (branding.logoUrl) — yoksa null (BrandLogo placeholder çizer). */
  logoUrl: string | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** brandDark/brandSoft türetim oranları — prototip paletindeki ton farkına yakın. */
const DARKEN_RATIO = 0.16;
const SOFTEN_RATIO = 0.9;

function buildTheme(brandKey: BrandKey, serverBranding: TenantBranding | null): ThemeTokens {
  if (serverBranding !== null) {
    return {
      ...baseTokens,
      colors: {
        ...neutralColors,
        brand: serverBranding.primaryColor,
        brandDark: darkenHex(serverBranding.primaryColor, DARKEN_RATIO),
        brandSoft: lightenHex(serverBranding.primaryColor, SOFTEN_RATIO),
        navy: serverBranding.secondaryColor ?? neutralColors.navy,
      },
    };
  }
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
  const [serverBranding, setServerBranding] = useState<TenantBranding | null>(null);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: buildTheme(brandKey, serverBranding),
      brandKey,
      setBrandKey,
      setServerBranding,
      logoUrl:
        serverBranding !== null && serverBranding.logoUrl !== '' ? serverBranding.logoUrl : null,
    }),
    [brandKey, serverBranding],
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
