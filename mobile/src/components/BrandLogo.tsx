/**
 * Marka logosu placeholder'ı — prototip BrandMark karşılığı (theme.jsx).
 * TODO(Faz 1.10): tenant branding'ten gerçek logo (logoUrl) yüklenecek.
 */
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface BrandLogoProps {
  /** Dış kare kenarı (px). */
  size?: number;
}

export function BrandLogo({ size = 76 }: BrandLogoProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: theme.colors.brand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: size * 0.13,
          backgroundColor: theme.colors.card,
        }}
      />
    </View>
  );
}
