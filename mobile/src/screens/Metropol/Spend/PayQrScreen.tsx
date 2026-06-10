/**
 * QR ile Ödeme (PRD §8.4 adım 2, screens-metropol-pay.jsx > PayQR).
 * KAMERA YOK: QR okuyucu native modül gerektirir (bu ortamda native klasör üretilemiyor,
 * LESSONS.md). Placeholder + manuel kod girişi fallback'i sunulur.
 * TODO(native): react-native-vision-camera (veya eşdeğeri) kurulunca gerçek QR tarama
 * eklenecek; okunan yük aynı şekilde PaySelectCard'a codeType=1 ile aktarılacak.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MetropolStackParamList, 'PayQr'>;

const QR_CODE_TYPE = 1; // CodeType 1 = QRCode (CLAUDE.md §6)

export function PayQrScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [manualCode, setManualCode] = useState('');

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.pay.qrTitle')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* kamera placeholder çerçevesi */}
        <View
          style={[
            styles.cameraFrame,
            { backgroundColor: theme.colors.navy, borderRadius: theme.radius.lg },
          ]}
        >
          <View style={[styles.scanBox, { borderColor: theme.colors.card }]} />
          <Text
            style={{
              color: theme.colors.card,
              fontSize: theme.fontSize.md,
              fontWeight: '600',
              textAlign: 'center',
              marginTop: theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
            }}
          >
            {t('metropol.pay.qrPlaceholder')}
          </Text>
        </View>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, lineHeight: 19 }}>
          {t('metropol.pay.qrManualHint')}
        </Text>
        <LabeledTextInput
          label={t('metropol.pay.qrManualLabel')}
          value={manualCode}
          onChangeText={setManualCode}
          placeholder={t('metropol.pay.qrManualPlaceholder')}
          autoCapitalize="none"
        />
        <PrimaryButton
          label={t('common.continue')}
          onPress={() =>
            navigation.navigate('PaySelectCard', {
              code: manualCode.trim(),
              codeType: QR_CODE_TYPE,
            })
          }
          disabled={manualCode.trim() === ''}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  cameraFrame: { paddingVertical: 36, alignItems: 'center', justifyContent: 'center' },
  scanBox: { width: 180, height: 180, borderWidth: 3, borderRadius: 20, opacity: 0.5 },
});
