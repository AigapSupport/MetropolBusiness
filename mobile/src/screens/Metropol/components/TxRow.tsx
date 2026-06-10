/**
 * İşlem satırı — prototip TxRow/History satırı karşılığı (PRD §8.6).
 * Tip ikonu + başlık + maskeli isim + onay no + işaretli tutar (yeşil/kırmızı) + tarih-saat.
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { TransactionItem } from '@shared/metropol';

import { useTheme } from '@/theme/ThemeProvider';
import { formatDateTime } from '@/utils/datetime';
import { absMoney, formatMoney, isNegativeMoney } from '@/utils/money';

interface TxRowProps {
  item: TransactionItem;
  last?: boolean;
}

export function TxRow({ item, last = false }: TxRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const negative = isNegativeMoney(item.amount);
  const amountColor = negative ? theme.colors.danger : theme.colors.success;
  const glyph = item.type === 'transfer' ? '⇄' : '▣';

  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.spacing.md,
          borderBottomColor: theme.colors.line2,
          borderBottomWidth: last ? 0 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: theme.colors.brandSoft, borderRadius: theme.radius.sm },
        ]}
      >
        <Text style={{ color: theme.colors.brand, fontSize: theme.fontSize.lg }}>{glyph}</Text>
      </View>
      <View style={styles.info}>
        <Text
          numberOfLines={1}
          style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}
        >
          {item.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: theme.fontSize.xs + 1,
            color: theme.colors.ink2,
            marginTop: theme.spacing.xs / 2,
          }}
        >
          {item.maskedName} · {t('metropol.history.approvalNo', { no: item.approvalNo })}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={{ fontSize: theme.fontSize.md, fontWeight: '800', color: amountColor }}>
          {negative ? '−' : '+'}
          {formatMoney(absMoney(item.amount))} ₺
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.colors.ink3,
            marginTop: theme.spacing.xs / 2,
          }}
        >
          {formatDateTime(item.date)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end' },
});
