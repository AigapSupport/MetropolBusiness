/**
 * Kart Ekle — Adım 2/3: SMS OTP (PRD §8.2, screens-metropol-cards.jsx > CardAdd2).
 * OTP burada Metropol'e gönderilmez; doğrulama kodu Adım 3'teki
 * POST /metropol/cards/confirm isteğinde validationCode olarak gider.
 * "Tekrar gönder" cards/add'i aynı kart+telefonla yeniden çağırır → yeni validationGuid.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OtpCodeInput } from '@/components/OtpCodeInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getMetropolErrorMessage, useAddCard } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { FlowStepBar } from '../components/FlowStepBar';

type Props = NativeStackScreenProps<MetropolStackParamList, 'AddCardOtp'>;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function AddCardOtpScreen({ navigation, route }: Props) {
  const { cardNo, phone, validationGuid: initialGuid } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const resend = useAddCard();

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

  const handleContinue = () => {
    navigation.navigate('AddCardInfo', { phone, validationGuid, validationCode: code });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.addCard.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <FlowStepBar step={2} total={3} />
        <View>
          <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.addCard.step2Heading')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              lineHeight: 21,
            }}
          >
            {t('metropol.addCard.step2Subtitle', { phone: `+90 ${phone}` })}
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
        {resend.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {getMetropolErrorMessage(resend.error, t('common.genericError'))}
          </Text>
        ) : null}
        <PrimaryButton
          label={t('metropol.addCard.verify')}
          onPress={handleContinue}
          disabled={code.length < OTP_LENGTH}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  resendRow: { alignItems: 'center' },
});
