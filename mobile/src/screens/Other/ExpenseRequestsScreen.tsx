/**
 * Masraf talebi + geçmiş (PRD §10.1, prototip screens-other.jsx > Expense):
 * tip, tutar (TAM/ondalıklı TL — string olarak taşınır, float yok), tarih,
 * fiş URL'i (dosya yükleme altyapısı ayrı iş — TODO), açıklama + geçmiş.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCreateExpenseRequest, useExpenseRequests } from '@/hooks/useHr';
import { getMetropolErrorMessage } from '@/hooks/useMetropol';
import { useTheme } from '@/theme/ThemeProvider';
import { StatusPill } from './StatusPill';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OtherStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OtherStackParamList, 'ExpenseRequests'>;

const EXPENSE_TYPES = ['travel', 'meal', 'lodging', 'stationery', 'other'] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function ExpenseRequestsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const history = useExpenseRequests();
  const create = useCreateExpenseRequest();

  const [type, setType] = useState<(typeof EXPENSE_TYPES)[number]>('travel');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function submit(): void {
    if (!AMOUNT_PATTERN.test(amount)) {
      setFormError(t('other.expense.amountError'));
      return;
    }
    if (!DATE_PATTERN.test(date)) {
      setFormError(t('other.leave.dateFormatError'));
      return;
    }
    setFormError(null);
    create.mutate(
      {
        type,
        amount: amount.includes('.') ? amount : `${amount}.00`,
        date,
        receiptUrl: receiptUrl === '' ? undefined : receiptUrl,
        note: note === '' ? undefined : note,
      },
      {
        onSuccess: () => {
          setAmount('');
          setDate('');
          setReceiptUrl('');
          setNote('');
        },
      },
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('other.expense.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
          {t('other.expense.typeLabel')}
        </Text>
        <View style={styles.typeRow}>
          {EXPENSE_TYPES.map((value) => (
            <Pressable
              key={value}
              onPress={() => setType(value)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: 999,
                backgroundColor: type === value ? theme.colors.brand : theme.colors.card,
              }}
            >
              <Text
                style={{
                  color: type === value ? '#FFFFFF' : theme.colors.ink,
                  fontWeight: '700',
                  fontSize: theme.fontSize.sm,
                }}
              >
                {t(`other.expense.types.${value}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <LabeledTextInput
          label={t('other.expense.amountLabel')}
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^\d.]/g, ''))}
          placeholder="1500.00"
          keyboardType="decimal-pad"
        />
        <LabeledTextInput
          label={t('other.expense.dateLabel')}
          value={date}
          onChangeText={setDate}
          placeholder="2026-06-11"
        />
        {/* Dosya yükleme altyapısı (depolama + imzalı URL) ayrı iş — şimdilik URL girişi. */}
        <LabeledTextInput
          label={t('other.expense.receiptLabel')}
          value={receiptUrl}
          onChangeText={setReceiptUrl}
          placeholder="https://… (opsiyonel)"
        />
        <LabeledTextInput
          label={t('other.leave.noteLabel')}
          value={note}
          onChangeText={setNote}
          placeholder={t('other.leave.notePlaceholder')}
        />

        {formError !== null ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>{formError}</Text>
        ) : null}
        {create.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {getMetropolErrorMessage(create.error, t('home.sectionError'))}
          </Text>
        ) : null}

        <PrimaryButton
          label={t('other.expense.submit')}
          onPress={submit}
          disabled={amount === ''}
          loading={create.isPending}
        />

        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: '700',
            color: theme.colors.ink2,
            marginTop: theme.spacing.lg,
            letterSpacing: 0.4,
          }}
        >
          {t('other.historyTitle')}
        </Text>
        {history.isPending ? (
          <ActivityIndicator color={theme.colors.brand} />
        ) : history.isError ? (
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
        ) : history.data.items.length === 0 ? (
          <Text style={{ color: theme.colors.ink2 }}>{t('other.expense.empty')}</Text>
        ) : (
          history.data.items.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>
                  {t(`other.expense.types.${item.type}`, { defaultValue: item.type })}
                </Text>
                <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
                  {item.date}
                </Text>
              </View>
              <Text style={{ color: theme.colors.ink, fontWeight: '800' }}>{item.amount} ₺</Text>
              <StatusPill status={item.status} />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
