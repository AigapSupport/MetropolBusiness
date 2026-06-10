/**
 * Marka logosu — tenant branding'inden logoUrl varsa onu gösterir (runtime
 * white-label, TODO 1.10); yoksa marka renkli placeholder (prototip BrandMark).
 */
import { Image, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface BrandLogoProps {
  /** Dış kare kenarı (px). */
  size?: number;
}

export function BrandLogo({ size = 76 }: BrandLogoProps) {
  const { theme, logoUrl } = useTheme();

  if (logoUrl !== null) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: size * 0.32 }}
        resizeMode="contain"
      />
    );
  }

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
