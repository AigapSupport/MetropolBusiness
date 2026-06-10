/** Stack ekranı üst barı — prototip TopBar karşılığı (geri oku + ortalanmış başlık). */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { BackButton } from './BackButton';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.row, { paddingHorizontal: theme.spacing.sm }]}>
      <BackButton onPress={onBack} />
      <Text
        numberOfLines={1}
        style={[styles.title, { color: theme.colors.ink, fontSize: theme.fontSize.lg }]}
      >
        {title}
      </Text>
      {/* Başlığın ortalanması için geri butonuyla simetrik boşluk */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontWeight: '800' },
  spacer: { width: 44 },
});
