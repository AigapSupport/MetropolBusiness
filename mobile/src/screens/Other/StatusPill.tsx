/** İK talep durum rozeti (prototip StatusBadge karşılığı) — renkler tema token'larından. */
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Beklemede için ayrı "warning" token'ı yok — marka rengi kullanılır (prototip turuncusu
  // yerine tema uyumlu; yeni token gerekirse tokens.ts'e eklenir).
  const color =
    status === 'approved'
      ? theme.colors.success
      : status === 'rejected'
        ? theme.colors.danger
        : theme.colors.brand;

  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color, fontWeight: '700', fontSize: theme.fontSize.xs }}>
        {t(`other.status.${status}`, { defaultValue: status })}
      </Text>
    </View>
  );
}
