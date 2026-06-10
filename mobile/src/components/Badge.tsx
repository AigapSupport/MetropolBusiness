/** Rozet — prototip Badge karşılığı (theme.jsx). Renkler yalnızca tema token'larından. */
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type BadgeVariant = 'success' | 'brand' | 'navy';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** true: yumuşak zemin + renkli metin (varsayılan); false: dolu zemin + beyaz metin. */
  soft?: boolean;
}

export function Badge({ label, variant = 'brand', soft = true }: BadgeProps) {
  const { theme } = useTheme();
  const palette = {
    success: { solid: theme.colors.success, soft: theme.colors.successSoft },
    brand: { solid: theme.colors.brand, soft: theme.colors.brandSoft },
    navy: { solid: theme.colors.navy, soft: theme.colors.navySoft },
  }[variant];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: soft ? palette.soft : palette.solid,
        borderRadius: 999,
        paddingHorizontal: theme.spacing.sm + 2,
        paddingVertical: theme.spacing.xs - 1,
      }}
    >
      <Text
        style={{
          color: soft ? palette.solid : theme.colors.card,
          fontSize: theme.fontSize.xs,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
