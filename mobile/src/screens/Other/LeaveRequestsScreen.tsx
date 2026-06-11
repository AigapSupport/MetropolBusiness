/**
 * İzin talebi + geçmiş (PRD §10.1, prototip screens-other.jsx > Leave):
 * tip seçimi, başlangıç/bitiş tarihi (YYYY-AA-GG metin girişi — yerel takvim
 * bileşeni native modül gerektirdiğinden Faz sonrası), gün sayısı backend'de
 * hesaplanır (önizleme istemcide), açıklama, gönder + durum rozetli geçmiş.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCreateLeaveRequest, useLeaveRequests } from '@/hooks/useHr';
import { getMetropolErrorMessage } from '@/hooks/useMetropol';
import { useTheme } from '@/theme/ThemeProvider';
import { StatusPill } from './StatusPill';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OtherStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OtherStackParamList, 'LeaveRequests'>;

/** İzin tipi slug'ları — backend serbest slug kabul eder; etiketler localization'dan. */
const LEAVE_TYPES = ['annual', 'excuse', 'sick', 'unpaid'] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayCount(start: string, end: string): number | null {
  if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) {
    return null;
  }
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.round(ms / 86_400_000) + 1;
  return days > 0 ? days : null;
}

export function LeaveRequestsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const history = useLeaveRequests();
  const create = useCreateLeaveRequest();

  const [type, setType] = useState<(typeof LEAVE_TYPES)[number]>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const days = dayCount(startDate, endDate === '' ? startDate : endDate);

  function submit(): void {
    const effectiveEnd = endDate === '' ? startDate : endDate;
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(effectiveEnd)) {
      setFormError(t('other.leave.dateFormatError'));
      return;
    }
    setFormError(null);
    create.mutate(
      { type, startDate, endDate: effectiveEnd, note: note === '' ? undefined : note },
      {
        onSuccess: () => {
          setStartDate('');
          setEndDate('');
          setNote('');
        },
      },
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('other.leave.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
          {t('other.leave.typeLabel')}
        </Text>
        <View style={styles.typeRow}>
          {LEAVE_TYPES.map((value) => (
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
                  // Seçili çip marka zemininde sabit beyaz (kontrast); diğerleri tema mürekkebi.
                  color: type === value ? '#FFFFFF' : theme.colors.ink,
                  fontWeight: '700',
                  fontSize: theme.fontSize.sm,
                }}
              >
                {t(`other.leave.types.${value}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <LabeledTextInput
          label={t('other.leave.startDate')}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-07-01"
        />
        <LabeledTextInput
          label={t('other.leave.endDate')}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-07-05"
        />

        {days !== null ? (
          <View
            style={{
              backgroundColor: theme.colors.navySoft,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: theme.colors.ink2, fontWeight: '600' }}>
              {t('other.leave.totalDays')}
            </Text>
            <Text style={{ color: theme.colors.brand, fontWeight: '800' }}>
              {t('other.leave.daysValue', { count: days })}
            </Text>
          </View>
        ) : null}

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
          label={t('other.leave.submit')}
          onPress={submit}
          disabled={startDate === ''}
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
          <Text style={{ color: theme.colors.ink2 }}>{t('other.leave.empty')}</Text>
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
                  {t(`other.leave.types.${item.type}`, { defaultValue: item.type })}
                </Text>
                <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
                  {item.startDate} – {item.endDate} · {t('other.leave.daysValue', { count: item.days })}
                </Text>
              </View>
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
