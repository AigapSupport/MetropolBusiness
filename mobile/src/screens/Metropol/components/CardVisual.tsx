/**
 * Kart görseli — prototip screens-metropol-home.jsx > CardVisual'ın RN karşılığı.
 * Gradient yerine (native modül gerektirmemesi için) navy/brand dolgu kullanılır;
 * sıraya göre renk değişir. Numara backend'den MASKELİ gelir (CLAUDE.md §2.4).
 * Renkler tema token'larından; kart üstü yarı saydam zemin token'dan hex-alpha türetilir.
 */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface CardVisualProps {
  holderName: string;
  maskedCardNo: string;
  /** Slider sırası — zemin rengi dönüşümlü (navy/brand). */
  index?: number;
  onRefresh?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

interface CircleButtonProps {
  glyph: string;
  label: string;
  onPress: () => void;
  backgroundColor: string;
  color: string;
}

/** Karttaki yarı saydam yuvarlak ikon butonu (prototip CircBtn). */
function CircleButton({ glyph, label, onPress, backgroundColor, color }: CircleButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.circleButton, { backgroundColor }]}
    >
      <Text style={[styles.circleGlyph, { color }]}>{glyph}</Text>
    </Pressable>
  );
}

export function CardVisual({
  holderName,
  maskedCardNo,
  index = 0,
  onRefresh,
  onCopy,
  onDelete,
}: CardVisualProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const background = index % 2 === 0 ? theme.colors.navy : theme.colors.brand;
  const onCardText = theme.colors.card;
  // Token rengine hex-alpha eki — kart üstü yarı saydam buton zemini ("2E" ≈ %18).
  const overlay = `${theme.colors.card}2E`;

  return (
    <View style={[styles.card, { backgroundColor: background, borderRadius: theme.radius.lg }]}>
      {/* üst satır: aksiyon ikonları + ürün markası */}
      <View style={styles.topRow}>
        <View style={[styles.iconRow, { gap: theme.spacing.sm }]}>
          {onRefresh !== undefined ? (
            <CircleButton
              glyph="⟳"
              label={t('metropol.card.refresh')}
              onPress={onRefresh}
              backgroundColor={overlay}
              color={onCardText}
            />
          ) : null}
          {onDelete !== undefined ? (
            <CircleButton
              glyph="🗑"
              label={t('metropol.card.delete')}
              onPress={onDelete}
              backgroundColor={overlay}
              color={onCardText}
            />
          ) : null}
        </View>
        <Text style={[styles.brandWord, { color: onCardText }]}>
          {t('metropol.card.productBrand')}
        </Text>
      </View>

      {/* numara + sahibi + kopyala */}
      <View>
        <Text style={[styles.number, { color: onCardText }]}>{maskedCardNo}</Text>
        <View style={styles.bottomRow}>
          <View>
            <Text style={[styles.holderLabel, { color: onCardText }]}>
              {t('metropol.card.holderLabel')}
            </Text>
            <Text style={[styles.holderName, { color: onCardText }]}>{holderName}</Text>
          </View>
          {onCopy !== undefined ? (
            <Pressable
              onPress={onCopy}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('metropol.card.copy')}
            >
              <Text style={[styles.copyGlyph, { color: onCardText }]}>❐</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.58,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconRow: { flexDirection: 'row' },
  circleButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGlyph: { fontSize: 14, fontWeight: '700' },
  brandWord: { fontSize: 13, fontWeight: '800', letterSpacing: -0.3, opacity: 0.96 },
  number: { fontSize: 18, fontWeight: '600', letterSpacing: 1.5, marginBottom: 10 },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  holderLabel: { fontSize: 9, fontWeight: '600', opacity: 0.6, letterSpacing: 0.5, marginBottom: 2 },
  holderName: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  copyGlyph: { fontSize: 18, opacity: 0.85 },
});
