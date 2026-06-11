/** Dil seçimi (PRD §11.2): TR/EN — i18next runtime değişimi (kalıcılık Faz sonrası). */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
] as const;

export function LanguageScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('account.menu.language')} onBack={() => navigation.goBack()} />
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
        {LANGUAGES.map((language) => (
          <Pressable
            key={language.code}
            onPress={() => {
              void i18n.changeLanguage(language.code);
            }}
            accessibilityRole="button"
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.md,
                padding: theme.spacing.lg,
              },
            ]}
          >
            <Text style={{ color: theme.colors.ink, fontWeight: '600', flex: 1 }}>
              {language.label}
            </Text>
            {i18n.language === language.code ? (
              <Text style={{ color: theme.colors.brand, fontWeight: '800' }}>✓</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
