/**
 * QR Kod Alıcı (PRD §8.7, screens-metropol-transfer.jsx > TransferQR).
 * KAMERA YOK: QR okuyucu native modül gerektirir (LESSONS.md) — placeholder +
 * manuel QR yükü girişi fallback'i. Yük POST /metropol/transfer/resolve-qr ile
 * çözülür; maskeli alıcı + opak token transfer formuna (mode 'fixed') aktarılır.
 * TODO(native): kamera modülü kurulunca okunan yük aynı resolve-qr akışına girecek.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
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

  const handleResolve = () => {
    resolveQr.mutate(
      { qrPayload: payload.trim() },
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

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.transfer.qrRecipient')} onBack={() => navigation.goBack()} />
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
          onPress={handleResolve}
          disabled={payload.trim() === ''}
          loading={resolveQr.isPending}
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
