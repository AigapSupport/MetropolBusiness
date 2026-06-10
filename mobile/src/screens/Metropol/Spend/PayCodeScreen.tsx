/**
 * Kısa Kod ile Ödeme (PRD §8.4 adım 2, screens-metropol-pay.jsx > PayCode).
 * POS ekranındaki 6 haneli kod girilir → kart seçimine geçilir (codeType=2).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OtpCodeInput } from '@/components/OtpCodeInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MetropolStackParamList, 'PayCode'>;

const SHORT_CODE_LENGTH = 6;
const QUICK_CODE_TYPE = 2; // CodeType 2 = QuickCode (CLAUDE.md §6)

export function PayCodeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [code, setCode] = useState('');

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.pay.codeTitle')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headingWrap}>
          <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.pay.codeHeading')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              textAlign: 'center',
            }}
          >
            {t('metropol.pay.codeSubtitle')}
          </Text>
        </View>
        <OtpCodeInput value={code} onChange={setCode} length={SHORT_CODE_LENGTH} />
        <PrimaryButton
          label={t('common.continue')}
          onPress={() => navigation.navigate('PaySelectCard', { code, codeType: QUICK_CODE_TYPE })}
          disabled={code.length < SHORT_CODE_LENGTH}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headingWrap: { alignItems: 'center', marginTop: 12 },
});
