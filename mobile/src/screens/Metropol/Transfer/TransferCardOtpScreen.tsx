/**
 * Başka Karta — Adım 2/2: SMS OTP doğrulama (PRD §8.7; desen AddCardOtpScreen).
 * Kod ALICININ karta kayıtlı telefonuna gider — alıcı kodu gönderene söyler (aile içi
 * senaryo). "Tekrar gönder" verify-card'ı aynı kart+telefonla yeniden çağırır → yeni
 * validationGuid (kullanıcı başına rate-limit'e tabidir; 429 RATE_LIMITED mesajı
 * getMetropolErrorMessage ile gösterilir). Doğrula → POST /metropol/transfer/confirm-card:
 * alıcının kartı KAYDEDİLMEZ; maskeli ad/kart no + opak receiverToken döner ve mevcut
 * transfer formuna (mode 'fixed', receiver.type='card') aktarılır.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OtpCodeInput } from '@/components/OtpCodeInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  getMetropolErrorMessage,
  useConfirmRecipientCard,
  useVerifyRecipientCard,
} from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { FlowStepBar } from '../components/FlowStepBar';

type Props = NativeStackScreenProps<MetropolStackParamList, 'TransferCardOtp'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function TransferCardOtpScreen({ navigation, route }: Props) {
  const { cardNo, phone, validationGuid: initialGuid } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const resend = useVerifyRecipientCard();
  const confirmCard = useConfirmRecipientCard();

  const [validationGuid, setValidationGuid] = useState(initialGuid);
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = () => {
    resend.mutate(
      { cardNo, mobilePhone: phone },
      {
        onSuccess: (response) => {
          setValidationGuid(response.validationGuid);
          setCode('');
          setSecondsLeft(RESEND_SECONDS);
        },
      },
    );
  };

  const handleVerify = () => {
    confirmCard.mutate(
      { validationGuid, validationCode: Number(code) },
      {
        onSuccess: (response) => {
          // Doğrulanmış alıcı mevcut forma aktarılır; oradan TransferConfirm'e gidilir
          // (receiver { type: 'card', value: receiverToken } — QR akışıyla aynı desen).
          navigation.replace('TransferForm', {
            mode: 'fixed',
            receiver: {
              type: 'card',
              value: response.receiverToken,
              maskedName: response.receiverMaskedName,
              maskedCardNo: response.receiverMaskedCardNo,
            },
          });
        },
      },
    );
  };

  // Tek hata satırı: doğrulama hatası öncelikli, yoksa tekrar gönderme hatası.
  const activeError = confirmCard.isError
    ? confirmCard.error
    : resend.isError
      ? resend.error
      : null;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.transfer.toOtherCard')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <FlowStepBar step={2} total={2} />
        <View>
          <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.transfer.otherCardOtpHeading')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              lineHeight: 21,
            }}
          >
            {t('metropol.transfer.otherCardOtpSubtitle')}
          </Text>
        </View>
        <OtpCodeInput value={code} onChange={setCode} length={OTP_LENGTH} />
        <View style={styles.resendRow}>
          {secondsLeft > 0 ? (
            <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.ink2 }}>
              {t('auth.resendCountdown', {
                time: `0:${String(secondsLeft).padStart(2, '0')}`,
              })}
            </Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resend.isPending} hitSlop={8}>
              <Text
                style={{
                  fontSize: theme.fontSize.md,
                  fontWeight: '700',
                  color: theme.colors.brand,
                  opacity: resend.isPending ? 0.5 : 1,
                }}
              >
                {t('auth.resend')}
              </Text>
            </Pressable>
          )}
        </View>
        {activeError !== null ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {getMetropolErrorMessage(activeError, t('common.genericError'))}
          </Text>
        ) : null}
        <PrimaryButton
          label={t('metropol.addCard.verify')}
          onPress={handleVerify}
          disabled={code.length < OTP_LENGTH}
          loading={confirmCard.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  resendRow: { alignItems: 'center' },
});
