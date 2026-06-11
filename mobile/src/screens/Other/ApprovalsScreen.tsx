/**
 * Masraf/izin onayı (PRD §10.1, prototip screens-other.jsx > ExpenseApprove):
 * onay bekleyenler (talep eden, tutar/tarih, fiş linki) + Onayla/Reddet.
 * Yetki backend'de doğrulanır (expense_approval — izin onayını da kapsar).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useDecideExpense, useDecideLeave, usePendingApprovals } from '@/hooks/useHr';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OtherStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OtherStackParamList, 'Approvals'>;
type ApprovalTab = 'expense' | 'leave';

export function ApprovalsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [tab, setTab] = useState<ApprovalTab>('expense');
  const pending = usePendingApprovals(true);
  const decideExpense = useDecideExpense();
  const decideLeave = useDecideLeave();

  const activeQuery = tab === 'expense' ? pending.expenses : pending.leaves;

  function actionButtons(onApprove: () => void, onReject: () => void, busy: boolean) {
    return (
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <Pressable
          onPress={onApprove}
          disabled={busy}
          accessibilityRole="button"
          style={[styles.actionButton, { backgroundColor: theme.colors.success, opacity: busy ? 0.6 : 1 }]}
        >
          <Text style={styles.actionText}>{t('other.approvals.approve')}</Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={busy}
          accessibilityRole="button"
          style={[
            styles.actionButton,
            {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: theme.colors.danger,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: theme.colors.danger }]}>
            {t('other.approvals.reject')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('other.approvals.title')} onBack={() => navigation.goBack()} />

      <View style={{ flexDirection: 'row', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
        {(['expense', 'leave'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            accessibilityRole="button"
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: 999,
              backgroundColor: tab === value ? theme.colors.brand : theme.colors.card,
            }}
          >
            <Text
              style={{
                color: tab === value ? '#FFFFFF' : theme.colors.ink,
                fontWeight: '700',
                fontSize: theme.fontSize.sm,
              }}
            >
              {t(`other.approvals.tab.${value}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeQuery.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : activeQuery.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
          <Pressable onPress={() => void activeQuery.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          {tab === 'expense' ? (
            pending.expenses.data?.items.length === 0 ? (
              <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
                {t('other.approvals.empty')}
              </Text>
            ) : (
              pending.expenses.data?.items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.md,
                  }}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>
                        {item.requesterName ?? t('other.approvals.unknownRequester')}
                      </Text>
                      <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
                        {t(`other.expense.types.${item.type}`, { defaultValue: item.type })} · {item.date}
                      </Text>
                    </View>
                    <Text style={{ color: theme.colors.ink, fontWeight: '800', fontSize: 17 }}>
                      {item.amount} ₺
                    </Text>
                  </View>
                  {item.receiptUrl !== null ? (
                    <Pressable
                      onPress={() => {
                        void Linking.openURL(item.receiptUrl as string);
                      }}
                      hitSlop={8}
                      accessibilityRole="link"
                    >
                      <Text style={{ color: theme.colors.brand, fontWeight: '700', marginTop: 8 }}>
                        {t('other.approvals.viewReceipt')}
                      </Text>
                    </Pressable>
                  ) : null}
                  {actionButtons(
                    () => decideExpense.mutate({ id: item.id, approve: true }),
                    () => decideExpense.mutate({ id: item.id, approve: false }),
                    decideExpense.isPending,
                  )}
                </View>
              ))
            )
          ) : pending.leaves.data?.items.length === 0 ? (
            <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
              {t('other.approvals.empty')}
            </Text>
          ) : (
            pending.leaves.data?.items.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.lg,
                  padding: theme.spacing.md,
                }}
              >
                <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>
                  {t(`other.leave.types.${item.type}`, { defaultValue: item.type })}
                </Text>
                <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
                  {item.startDate} – {item.endDate} · {t('other.leave.daysValue', { count: item.days })}
                </Text>
                {actionButtons(
                  () => decideLeave.mutate({ id: item.id, approve: true }),
                  () => decideLeave.mutate({ id: item.id, approve: false }),
                  decideLeave.isPending,
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center', gap: 8, marginTop: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Yeşil zemin üzerinde sabit beyaz buton metni (kontrast).
  actionText: { color: '#FFFFFF', fontWeight: '800' },
});
