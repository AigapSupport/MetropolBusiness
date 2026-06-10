/** Üst geri butonu — auth ekranları için (prototip Wrap > back oku karşılığı). */
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={{ padding: theme.spacing.sm, alignSelf: 'flex-start' }}
    >
      <Text style={{ fontSize: theme.fontSize.xl, color: theme.colors.ink, fontWeight: '600' }}>
        ←
      </Text>
    </Pressable>
  );
}
