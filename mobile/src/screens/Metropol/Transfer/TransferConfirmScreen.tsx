/**
 * Transfer — İşlem Onayı (PRD §8.7, screens-metropol-transfer.jsx > TransferConfirm).
 * Maskeli alıcı + tutar özeti, "Tanımlı alıcı olarak ekle" + kayıt adı, Onayla.
 *
 * Idempotency: useTransfer anahtarı başarıya kadar saklar — başarısız görünüm bu
 * ekranda inline çizilir ki "Tekrar Dene" AYNI Idempotency-Key ile gitsin.
 * Tutar TAM TL'dir; MoneyString'e burada çevrilir ("500" → "500.00").
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getMetropolErrorMessage, useTransfer } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney, wholeLiraToMoney } from '@/utils/money';

import { walletLabelKey } from '../wallets';

type Props = NativeStackScreenProps<MetropolStackParamList, 'TransferConfirm'>;

export function TransferConfirmScreen({ navigation, route }: Props) {
  const params = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const transfer = useTransfer();

  const [saveRecipient, setSaveRecipient] = useState(false);
  const [recipientLabel, setRecipientLabel] = useState('');

  const amountMoney = wholeLiraToMoney(params.amountWholeLira);
  const saveValid = !saveRecipient || recipientLabel.trim() !== '';

  const handleConfirm = () => {
    transfer.mutate(
      {
        senderCardId: params.senderCardId,
        receiver: { type: params.receiverType, value: params.receiverValue },
        walletId: params.walletId,
        amount: amountMoney,
        note: params.note === '' ? undefined : params.note,
        saveRecipient: params.allowSaveRecipient && saveRecipient,
        recipientLabel:
          params.allowSaveRecipient && saveRecipient ? recipientLabel.trim() : undefined,
      },
      {
        onSuccess: (response) => {
          navigation.replace('TransferSuccess', {
            receipt: {
              senderName: response.senderName,
              receiverMaskedName: response.receiverMaskedName,
              receiverMaskedCardNo: response.receiverMaskedCardNo,
              amount: response.amount,
              date: response.date,
              walletId: params.walletId,
            },
          });
        },
      },
    );
  };

  // ── Başarısız transfer görünümü (inline; mutation/anahtar korunur) ──
  if (transfer.isError) {
    return (
      <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
        <View style={[styles.failWrap, { padding: theme.spacing.xl, gap: theme.spacing.md }]}>
          <View style={[styles.failCircle, { backgroundColor: theme.colors.danger }]}>
            <Text style={{ color: theme.colors.card, fontSize: 34, fontWeight: '800' }}>✕</Text>
          </View>
          <Text style={{ fontSize: theme.fontSize.xl + 2, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.transfer.failTitle')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {getMetropolErrorMessage(transfer.error, t('common.genericError'))}
          </Text>
          <View style={[styles.fullWidth, { marginTop: theme.spacing.lg, gap: theme.spacing.md }]}>
            {/* Tekrar Dene: AYNI Idempotency-Key ile (useTransfer anahtarı korur) */}
            <PrimaryButton
              label={t('metropol.pay.retry')}
              onPress={handleConfirm}
              loading={transfer.isPending}
            />
            <Pressable
              onPress={() => navigation.popToTop()}
              accessibilityRole="button"
              style={styles.centerSelf}
            >
              <Text style={{ color: theme.colors.ink2, fontWeight: '700', fontSize: theme.fontSize.md }}>
                {t('metropol.pay.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const line = (label: string, value: string, last = false) => (
    <View
      style={[
        styles.line,
        { borderBottomColor: theme.colors.line2, borderBottomWidth: last ? 0 : 1 },
      ]}
    >
      <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2 }}>{label}</Text>
      <Text
        style={[
          styles.lineValue,
          { fontSize: theme.fontSize.sm + 1, fontWeight: '700', color: theme.colors.ink },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.transfer.confirmTitle')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* tutar başlığı */}
        <View style={styles.amountWrap}>
          <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
            {t('metropol.transfer.amountTitle')}
          </Text>
          <Text style={{ fontSize: 40, fontWeight: '800', color: theme.colors.success }}>
            {formatMoney(amountMoney)} ₺
          </Text>
        </View>

        {/* özet panel — alıcı her zaman maskeli gösterilir */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.lg - 4,
          }}
        >
          {line(
            t('metropol.transfer.senderCard'),
            `${params.senderHolderName} · ${params.senderMaskedCardNo}`,
          )}
          {line(t('metropol.transfer.receiver'), params.receiverDisplayName)}
          {params.receiverDisplayCardNo !== ''
            ? line(t('metropol.transfer.receiverNo'), params.receiverDisplayCardNo)
            : null}
          {line(t('metropol.transfer.wallet'), t(walletLabelKey(params.walletId)))}
          {params.note !== '' ? line(t('metropol.transfer.noteLabel'), params.note, true) : null}
        </View>

        {/* tanımlı alıcı olarak ekle */}
        {params.allowSaveRecipient ? (
          <View style={{ gap: theme.spacing.md }}>
            <Pressable
              onPress={() => setSaveRecipient((current) => !current)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: saveRecipient }}
              style={[styles.checkboxRow, { gap: theme.spacing.md }]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: saveRecipient ? theme.colors.success : 'transparent',
                    borderColor: saveRecipient ? theme.colors.success : theme.colors.line,
                  },
                ]}
              >
                {saveRecipient ? (
                  <Text style={{ color: theme.colors.card, fontSize: 13, fontWeight: '800' }}>✓</Text>
                ) : null}
              </View>
              <Text style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.ink }}>
                {t('metropol.transfer.saveRecipient')}
              </Text>
            </Pressable>
            {saveRecipient ? (
              <LabeledTextInput
                label={t('metropol.transfer.recipientLabel')}
                value={recipientLabel}
                onChangeText={setRecipientLabel}
                placeholder={t('metropol.transfer.recipientLabelPlaceholder')}
              />
            ) : null}
          </View>
        ) : null}

        <PrimaryButton
          label={t('metropol.transfer.confirm')}
          onPress={handleConfirm}
          disabled={!saveValid}
          loading={transfer.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fullWidth: { width: '100%' },
  centerSelf: { alignSelf: 'center', padding: 8 },
  failWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  failCircle: {
    width: 84,
    height: 84,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountWrap: { alignItems: 'center' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  lineValue: { maxWidth: 210, textAlign: 'right' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
