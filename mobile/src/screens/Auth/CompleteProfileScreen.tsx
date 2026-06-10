/**
 * Profil tamamlama (PRD §5.1, prototip screens-auth.jsx > register).
 * OTP doğrulamasında isNewUser=true dönen kullanıcı ad/soyad/e-posta girer.
 * TODO(Faz 1.x): PUT /me ucu backend'de hazır olduğunda bu form sunucuya yazılacak
 * (docs/API_CONTRACT.md §2); şimdilik yalnızca onboarding tamamlanıp MainTabs'a geçilir.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';

/** Basit e-posta biçim kontrolü — asıl doğrulama backend'de (CLAUDE.md §8). */
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function CompleteProfileScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { completeProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && EMAIL_PATTERN.test(email.trim());

  const handleSubmit = () => {
    // Profil verisi şimdilik sunucuya yazılmıyor (PUT /me ucu bekleniyor — üstteki TODO).
    completeProfile();
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
          <Text
            style={{
              fontSize: theme.fontSize.xxl - 2,
              fontWeight: '800',
              color: theme.colors.ink,
            }}
          >
            {t('auth.completeProfileHeading')}
          </Text>
          <Text
            style={{
              marginTop: theme.spacing.sm,
              marginBottom: theme.spacing.lg,
              fontSize: theme.fontSize.md,
              lineHeight: 22,
              color: theme.colors.ink2,
            }}
          >
            {t('auth.completeProfileSubtitle')}
          </Text>

          <View style={{ gap: theme.spacing.md + 2 }}>
            <LabeledTextInput
              label={t('auth.firstNameLabel')}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('auth.firstNamePlaceholder')}
              autoCapitalize="words"
            />
            <LabeledTextInput
              label={t('auth.lastNameLabel')}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('auth.lastNamePlaceholder')}
              autoCapitalize="words"
            />
            <LabeledTextInput
              label={t('auth.emailLabel')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.flex} />

          <PrimaryButton
            label={t('common.continue')}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});
