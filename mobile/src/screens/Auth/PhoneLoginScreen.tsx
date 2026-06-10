/**
 * Telefon girişi (PRD §5.2, prototip screens-auth.jsx > phone).
 * Logo + başlık + telefon input (+90) + KVKK onayı + "Kod Gönder".
 * POST /auth/otp/send başarılı olursa OTP ekranına geçilir.
 * NOT: Firma kodu (companyCode) build-time tenant kararı gereği sorulmaz (PRD §17).
 * TODO(Faz 1.2+): biyometrik hızlı giriş — native klasörler gelince (LESSONS.md RN native kaydı).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/BrandLogo';
import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { getAuthErrorKey, useSendOtp } from '@/hooks/useAuth';
import type { AuthStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneLogin'>;

/** Türkiye cep numarası: ülke kodu hariç 10 hane (5XX XXX XX XX). */
const PHONE_LENGTH = 10;

export function PhoneLoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const sendOtp = useSendOtp();

  const [phone, setPhone] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);

  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, PHONE_LENGTH));
  };

  const canSubmit = phone.length === PHONE_LENGTH && kvkkAccepted;

  const handleSend = () => {
    sendOtp.mutate(
      { phone },
      {
        onSuccess: (response) => {
          navigation.navigate('Otp', {
            phone,
            otpRef: response.otpRef,
            resendInSeconds: response.resendInSeconds,
          });
        },
      },
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { padding: theme.spacing.lg + 4 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.logoWrap, { marginVertical: theme.spacing.xl }]}>
            <BrandLogo size={64} />
          </View>

          <Text
            style={{
              fontSize: theme.fontSize.xxl - 2,
              fontWeight: '800',
              color: theme.colors.ink,
            }}
          >
            {t('auth.phoneHeading')}
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
            {t('auth.phoneSubtitle')}
          </Text>

          <LabeledTextInput
            label={t('auth.phoneLabel')}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder={t('auth.phonePlaceholder')}
            prefix="+90"
            keyboardType="phone-pad"
            maxLength={PHONE_LENGTH}
          />

          <Pressable
            onPress={() => setKvkkAccepted((accepted) => !accepted)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: kvkkAccepted }}
            style={[styles.kvkkRow, { marginTop: theme.spacing.lg }]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: kvkkAccepted ? theme.colors.success : 'transparent',
                  borderColor: kvkkAccepted ? theme.colors.success : theme.colors.line,
                },
              ]}
            >
              {kvkkAccepted ? (
                <Text style={{ color: theme.colors.card, fontSize: theme.fontSize.sm }}>✓</Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.kvkkText,
                { color: theme.colors.ink2, fontSize: theme.fontSize.sm },
              ]}
            >
              {t('auth.kvkkConsent')}
            </Text>
          </Pressable>

          {sendOtp.isError ? (
            <Text
              style={{
                marginTop: theme.spacing.md,
                color: theme.colors.danger,
                fontSize: theme.fontSize.sm,
              }}
            >
              {t(getAuthErrorKey(sendOtp.error))}
            </Text>
          ) : null}

          <View style={styles.flex} />

          <PrimaryButton
            label={t('auth.sendCode')}
            onPress={handleSend}
            disabled={!canSubmit}
            loading={sendOtp.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  logoWrap: { alignItems: 'center' },
  kvkkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  kvkkText: { flex: 1, lineHeight: 19 },
});
