/**
 * QR ile Ödeme (PRD §8.4 adım 2, screens-metropol-pay.jsx > PayQR).
 * Gerçek tarama react-native-vision-camera ile (QrScannerBox: qr + code-128).
 * Modül yüklenemezse ya da kamera izni reddedilirse manuel kod girişi fallback'i
 * görünür kalır. Okunan/girilen kod aynı şekilde PaySelectCard'a codeType=1 ile
 * aktarılır — kart seçimi presale'den ÖNCE yapılır (CLAUDE.md §6 sırası).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QrScannerBox } from '@/components/QrScannerBox';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MetropolStackParamList, 'PayQr'>;

const QR_CODE_TYPE = 1; // CodeType 1 = QRCode (CLAUDE.md §6)

export function PayQrScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [manualCode, setManualCode] = useState('');

  /** Okunan/girilen kod mevcut akışa girer: presale öncesi kart seçimi. */
  const goToSelectCard = (code: string) => {
    navigation.navigate('PaySelectCard', { code, codeType: QR_CODE_TYPE });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.pay.qrTitle')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <QrScannerBox onScanned={(value) => goToSelectCard(value.trim())} />
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
          onPress={() => goToSelectCard(manualCode.trim())}
          disabled={manualCode.trim() === ''}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
