/**
 * QR Kod Alıcı (PRD §8.7, screens-metropol-transfer.jsx > TransferQR).
 * Gerçek tarama react-native-vision-camera ile (QrScannerBox: qr + code-128);
 * modül yoksa/izin reddedilirse manuel QR yükü girişi fallback'i görünür kalır.
 * Okunan/girilen yük POST /metropol/transfer/resolve-qr ile çözülür; maskeli
 * alıcı + opak token transfer formuna (mode 'fixed') aktarılır.
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
import { getMetropolErrorMessage, useResolveTransferQr } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MetropolStackParamList, 'TransferQr'>;

export function TransferQrScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const resolveQr = useResolveTransferQr();
  const [payload, setPayload] = useState('');

  /** Okunan/girilen yük aynı resolve-qr akışına girer (mevcut akış korunur). */
  const resolvePayload = (qrPayload: string) => {
    if (resolveQr.isPending) {
      return;
    }
    resolveQr.mutate(
      { qrPayload },
      {
        onSuccess: (response) => {
          navigation.replace('TransferForm', {
            mode: 'fixed',
            receiver: {
              type: 'qr',
              value: response.receiverToken,
              maskedName: response.receiverMaskedName,
              maskedCardNo: response.receiverMaskedCardNo,
            },
          });
        },
      },
    );
  };

  /** Kameradan okunan yük inputa da yazılır: çözümleme başarısız olursa elle düzeltilebilir. */
  const handleScanned = (value: string) => {
    const trimmed = value.trim();
    setPayload(trimmed);
    resolvePayload(trimmed);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.transfer.qrRecipient')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <QrScannerBox onScanned={handleScanned} />
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, lineHeight: 19 }}>
          {t('metropol.transfer.qrManualHint')}
        </Text>
        <LabeledTextInput
          label={t('metropol.pay.qrManualLabel')}
          value={payload}
          onChangeText={setPayload}
          placeholder={t('metropol.pay.qrManualPlaceholder')}
          autoCapitalize="none"
        />
        {resolveQr.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {getMetropolErrorMessage(resolveQr.error, t('common.genericError'))}
          </Text>
        ) : null}
        <PrimaryButton
          label={t('common.continue')}
          onPress={() => resolvePayload(payload.trim())}
          disabled={payload.trim() === ''}
          loading={resolveQr.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
