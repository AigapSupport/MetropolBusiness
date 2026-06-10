/**
 * Ödeme Başarılı — fiş ekranı (PRD §8.4 adım 7, screens-metropol-pay.jsx > PaySuccess).
 * Fişte maskeli kart no, onay no, tutar, tarih gösterilir; bakiye listeleri
 * useSaleConfirm başarısında zaten invalidate edilmiştir (bakiye ayrı uçtan okunur).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDate, formatTime } from '@/utils/datetime';

import { ReceiptCard } from '../components/ReceiptCard';
import { walletLabelKey } from '../wallets';

type Props = NativeStackScreenProps<MetropolStackParamList, 'PaySuccess'>;

export function PaySuccessScreen({ navigation, route }: Props) {
  const { receipt } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        {/* yeşil başarı başlığı */}
        <View
          style={[
            styles.hero,
            { backgroundColor: theme.colors.success, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
          ]}
        >
          <View style={[styles.heroCircle, { backgroundColor: theme.colors.card }]}>
            <Text style={{ color: theme.colors.success, fontSize: 34, fontWeight: '800' }}>✓</Text>
          </View>
          <Text style={{ color: theme.colors.card, fontSize: theme.fontSize.xl + 3, fontWeight: '800' }}>
            {t('metropol.pay.successTitle')}
          </Text>
          <Text
            style={{
              color: theme.colors.card,
              fontSize: theme.fontSize.sm,
              opacity: 0.92,
              marginTop: theme.spacing.xs,
            }}
          >
            {t('metropol.pay.successSubtitle')}
          </Text>
        </View>

        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          <ReceiptCard
            title={receipt.merchantName}
            subtitle={`${formatDate(receipt.date)} · ${formatTime(receipt.date)} · ${t(
              walletLabelKey(receipt.walletId),
            )}`}
            rows={[
              { label: t('metropol.receipt.merchantNo'), value: receipt.merchantNo },
              { label: t('metropol.receipt.terminalNo'), value: receipt.terminalNo },
              { label: t('metropol.receipt.approvalNo'), value: receipt.approvalNo },
              { label: t('metropol.receipt.cardNo'), value: receipt.maskedCardNo },
            ]}
            statusLabel={t('metropol.receipt.saleSuccess')}
            amountLabel={t('metropol.receipt.amount')}
            amount={receipt.amount}
          />
          <PrimaryButton label={t('metropol.pay.done')} onPress={() => navigation.popToTop()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  heroCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
