/**
 * Seçilebilir kart satırı — prototip screens-metropol-pay.jsx > CardPick karşılığı.
 * Kart seçimi (harcama: presale'den ÖNCE) ve transfer gönderen/alıcı seçiminde kullanılır.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface CardPickRowProps {
  holderName: string;
  maskedCardNo: string;
  /** Mini kart önizlemesinin rengi sıraya göre değişir (navy/brand). */
  index?: number;
  selected: boolean;
  onPress: () => void;
}

export function CardPickRow({
  holderName,
  maskedCardNo,
  index = 0,
  selected,
  onPress,
}: CardPickRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.card,
          borderColor: selected ? theme.colors.brand : theme.colors.line,
          borderRadius: theme.radius.md,
          gap: theme.spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.miniCard,
          { backgroundColor: index % 2 === 0 ? theme.colors.navy : theme.colors.brand },
        ]}
      />
      <View style={styles.info}>
        <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}>
          {holderName}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.ink2,
            marginTop: theme.spacing.xs / 2,
          }}
        >
          {maskedCardNo}
        </Text>
      </View>
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? theme.colors.brand : theme.colors.line,
            backgroundColor: selected ? theme.colors.brand : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Text style={{ color: theme.colors.card, fontSize: 13, fontWeight: '800' }}>✓</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 2 },
  miniCard: { width: 54, height: 36, borderRadius: 8 },
  info: { flex: 1, minWidth: 0 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
