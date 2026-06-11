/**
 * OTP doğrulama (PRD §5.2-5.3, prototip screens-auth.jsx > otp).
 * 6 haneli kod kutuları + geri sayımlı "Tekrar gönder" (resendInSeconds).
 * 3 hatalı denemede backend OTP_LOCKED döner → giriş kilitlenir, yeni kod istenmeli.
 * Doğrulama başarılıysa store login; isNewUser=true ise profil tamamlamaya geçilir.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { OtpCodeInput } from '@/components/OtpCodeInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getAuthErrorKey, isOtpLockedError, useSendOtp, useVerifyOtp } from '@/hooks/useAuth';
import type { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

const OTP_LENGTH = 6;

/** Saniyeyi m:ss biçiminde gösterir (prototipteki 0:58 sayacı). */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function OtpScreen({ navigation, route }: Props) {
  const { phone, otpRef: initialOtpRef, resendInSeconds } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { login, suggestEnableBiometrics } = useAuth();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const [otpRef, setOtpRef] = useState(initialOtpRef);
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(resendInSeconds);

  // Geri sayım — her saniye bir azalır, 0'da "Tekrar gönder" aktifleşir.
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // 3 deneme kilidi: OTP_LOCKED geldiyse yeni kod istenene dek giriş kapalı.
  const locked = isOtpLockedError(verifyOtp.error);

  const handleResend = () => {
    sendOtp.mutate(
      { phone },
      {
        onSuccess: (response) => {
          setOtpRef(response.otpRef);
          setSecondsLeft(response.resendInSeconds);
          setCode('');
          verifyOtp.reset(); // kilit/hata durumu yeni kodla sıfırlanır
        },
      },
    );
  };

  const handleCodeChange = (next: string) => {
    setCode(next);
    if (verifyOtp.isError && !locked) {
      // Kullanıcı kodu düzeltmeye başladı — eski OTP_INVALID mesajını temizle.
      verifyOtp.reset();
    }
  };

  const handleVerify = () => {
    verifyOtp.mutate(
      { otpRef, code, phone },
      {
        onSuccess: (response) => {
          login(
            { accessToken: response.accessToken, refreshToken: response.refreshToken },
            response.isNewUser,
          );
          if (response.isNewUser) {
            navigation.navigate('CompleteProfile');
          }
          // Mevcut kullanıcıda RootNavigator MainTabs'a geçer; gezinme gerekmez.
          // Bir kerelik "Biyometrik girişi aç?" önerisi (PRD §5.1) — sensör yoksa
          // ya da kullanıcı daha önce seçim yaptıysa sessizce atlanır.
          suggestEnableBiometrics();
        },
      },
    );
  };

  // Önce doğrulama hatası (OTP_INVALID/OTP_LOCKED), yoksa tekrar gönderme hatası göster.
  const errorKey = verifyOtp.isError
    ? getAuthErrorKey(verifyOtp.error)
    : sendOtp.isError
      ? getAuthErrorKey(sendOtp.error)
      : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <BackButton onPress={() => navigation.goBack()} />
      <View style={[styles.content, { padding: theme.spacing.lg + 4 }]}>
        <Text
          style={{ fontSize: theme.fontSize.xxl - 2, fontWeight: '800', color: theme.colors.ink }}
        >
          {t('auth.otpHeading')}
        </Text>
        <Text
          style={{
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.xl,
            fontSize: theme.fontSize.md,
            lineHeight: 22,
            color: theme.colors.ink2,
          }}
        >
          {t('auth.otpSubtitle', { phone: `+90 ${phone}` })}
        </Text>

        <OtpCodeInput
          value={code}
          onChange={handleCodeChange}
          length={OTP_LENGTH}
          disabled={locked}
        />

        <View style={[styles.resendRow, { marginTop: theme.spacing.lg }]}>
          {secondsLeft > 0 ? (
            <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.ink2 }}>
              {t('auth.resendCountdown', { time: formatCountdown(secondsLeft) })}
            </Text>
          ) : (
            <Pressable onPress={handleResend} disabled={sendOtp.isPending} hitSlop={8}>
              <Text
                style={{
                  fontSize: theme.fontSize.md,
                  fontWeight: '700',
                  color: theme.colors.brand,
                  opacity: sendOtp.isPending ? 0.5 : 1,
                }}
              >
                {t('auth.resend')}
              </Text>
            </Pressable>
          )}
        </View>

        {errorKey !== null ? (
          <Text
            style={{
              marginTop: theme.spacing.md,
              textAlign: 'center',
              color: theme.colors.danger,
              fontSize: theme.fontSize.sm,
            }}
          >
            {t(errorKey)}
          </Text>
        ) : null}

        <View style={styles.flex} />

        <PrimaryButton
          label={t('auth.verifyAndLogin')}
          onPress={handleVerify}
          disabled={code.length < OTP_LENGTH || locked}
          loading={verifyOtp.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1 },
  resendRow: { alignItems: 'center' },
});
