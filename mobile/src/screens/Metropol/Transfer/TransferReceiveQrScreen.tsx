/**
 * QR ile Para Al (PRD §8.7'nin alıcı yarısı): kendi kartım için QR yükü üretilir;
 * gönderen bu QR'ı okutup resolve-qr ile çözer. QR görseli react-native-svg native
 * build ile gelecek [~] — o güne dek yük metni gösterilir ve kopyalanır
 * (BusinessCard deseni); kopyalanan yükü gönderen manuel girişle de çözebilir.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { metropolApi } from '@/api/metropol';
import { CardPickRow } from '../components/CardPickRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCards } from '@/hooks/useMetropol';
import { clipboardModule } from '@/utils/nativeModules';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MetropolStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MetropolStackParamList, 'TransferReceiveQr'>;

export function TransferReceiveQrScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cards = useCards();
  const [cardId, setCardId] = useState<string | null>(null);

  const qr = useQuery({
    queryKey: ['metropol', 'receive-qr', cardId],
    queryFn: () => metropolApi.getReceiveQr(cardId as string),
    enabled: cardId !== null,
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.transfer.receiveQrTitle')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
          {t('metropol.transfer.receiveQrHint')}
        </Text>

        {cards.isPending ? (
          <ActivityIndicator color={theme.colors.brand} />
        ) : (
          (cards.data?.items ?? []).map((card, index) => (
            <CardPickRow
              key={card.id}
              holderName={card.holderName}
              maskedCardNo={card.maskedCardNo}
              index={index}
              selected={card.id === cardId}
              onPress={() => setCardId(card.id)}
            />
          ))
        )}

        {qr.isPending && cardId !== null ? <ActivityIndicator color={theme.colors.brand} /> : null}
        {qr.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {t('home.sectionError')}
          </Text>
        ) : null}

        {qr.data !== undefined ? (
          <View style={{ gap: theme.spacing.sm }}>
            {/* QR görseli native build (react-native-svg) sonrası; yük metni geçici gösterim. */}
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
              }}
            >
              <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.xs, lineHeight: 18 }}>
                {qr.data.qrPayload}
              </Text>
            </View>
            {clipboardModule !== null ? (
              <Pressable
                onPress={() => clipboardModule?.default.setString(qr.data.qrPayload)}
                accessibilityRole="button"
                style={{
                  backgroundColor: theme.colors.brand,
                  borderRadius: theme.radius.md,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={styles.copyText}>{t('metropol.transfer.copyPayload')}</Text>
              </Pressable>
            ) : null}
            <Text
              style={{ color: theme.colors.ink3, fontSize: theme.fontSize.sm, textAlign: 'center' }}
            >
              {t('metropol.transfer.qrImageSoon')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  copyText: { color: '#FFFFFF', fontWeight: '800' },
});
