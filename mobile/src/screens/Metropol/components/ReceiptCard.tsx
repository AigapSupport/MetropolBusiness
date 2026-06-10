/**
 * Fiş kartı — prototip screens-metropol-pay.jsx > Receipt karşılığı.
 * Harcama ve transfer başarı ekranlarında ortak; satırlar çağırandan gelir.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { MoneyString } from '@shared/common';

import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney } from '@/utils/money';

export interface ReceiptRow {
  label: string;
  value: string;
}

interface ReceiptCardProps {
  title: string;
  subtitle: string;
  rows: ReceiptRow[];
  statusLabel: string;
  amountLabel: string;
  amount: MoneyString;
}

export function ReceiptCard({
  title,
  subtitle,
  rows,
  statusLabel,
  amountLabel,
  amount,
}: ReceiptCardProps) {
  const { theme } = useTheme();

  const dash = (
    <View style={[styles.dash, { borderTopColor: theme.colors.line }]} />
  );

  return (
    <View
      style={[styles.card, { backgroundColor: theme.colors.card, borderRadius: theme.radius.md }]}
    >
      <Text
        style={{
          textAlign: 'center',
          fontSize: theme.fontSize.lg,
          fontWeight: '800',
          color: theme.colors.ink,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          textAlign: 'center',
          fontSize: theme.fontSize.sm,
          color: theme.colors.ink2,
          marginTop: theme.spacing.xs,
        }}
      >
        {subtitle}
      </Text>
      {dash}
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2 }}>{row.label}</Text>
          <Text style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.ink }}>
            {row.value}
          </Text>
        </View>
      ))}
      {dash}
      <Text
        style={{
          textAlign: 'center',
          fontSize: theme.fontSize.sm,
          fontWeight: '800',
          color: theme.colors.success,
          letterSpacing: 0.5,
          marginBottom: theme.spacing.md,
        }}
      >
        {statusLabel}
      </Text>
      <View style={styles.amountRow}>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
          {amountLabel}
        </Text>
        <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
          {formatMoney(amount)} ₺
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20 },
  dash: { borderTopWidth: 1.5, borderStyle: 'dashed', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
