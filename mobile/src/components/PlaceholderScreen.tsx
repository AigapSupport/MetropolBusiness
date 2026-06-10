/** Faz 0 iskelet ekranı — başlık localization'dan, renkler tema token'larından gelir. */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface PlaceholderScreenProps {
  /** localization anahtarı (örn. "tabs.home") — metin hardcode edilmez */
  titleKey: string;
  children?: ReactNode;
}

export function PlaceholderScreen({ titleKey, children }: PlaceholderScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.bg, padding: theme.spacing.lg }]}
    >
      <Text style={{ color: theme.colors.ink, fontSize: theme.fontSize.xl, fontWeight: '700' }}>
        {t(titleKey)}
      </Text>
      <Text
        style={{
          color: theme.colors.ink2,
          fontSize: theme.fontSize.md,
          marginTop: theme.spacing.sm,
        }}
      >
        {t('common.comingSoon')}
      </Text>
      {children !== undefined ? (
        <View style={{ marginTop: theme.spacing.lg }}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
