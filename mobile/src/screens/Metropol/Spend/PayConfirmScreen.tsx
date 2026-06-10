/**
 * İşlem Bilgisi / Onay (PRD §8.4 adım 4-6, screens-metropol-pay.jsx > PayConfirm + PayFail).
 * Kart SEÇİLDİKTEN sonra burada presale-info çağrılır (sıra kritik, CLAUDE.md §6);
 * banner'da tutar + mağaza + ürün, cüzdan seçimi (suggestedWalletId ön-seçili), ÖDE.
 *
 * Idempotency: useSaleConfirm anahtar yaşam döngüsünü yönetir — başarısız denemenin
 * "Tekrar Dene"si AYNI Idempotency-Key ile gider (başarısız görünüm bu ekranda inline
 * çizilir ki mutation hook'u ve anahtarı yaşamaya devam etsin). consumerRefCode de
 * akış başına bir kez üretilir ve tekrarlarda değişmez (çift harcama engeli).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { WalletId } from '@shared/metropol';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  getMetropolErrorMessage,
  useBalance,
  useCards,
  usePresaleInfo,
  useSaleConfirm,
} from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney } from '@/utils/money';
import { createUuid } from '@/utils/uuid';

import { CardPickRow } from '../components/CardPickRow';
import { SELECTABLE_WALLET_IDS, walletAccent, walletLabelKey } from '../wallets';

type Props = NativeStackScreenProps<MetropolStackParamList, 'PayConfirm'>;

export function PayConfirmScreen({ navigation, route }: Props) {
  const { code, codeType, cardId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();

  const cardsQuery = useCards();
  const balanceQuery = useBalance(cardId);
  const presale = usePresaleInfo();
  const saleConfirm = useSaleConfirm();

  const [walletId, setWalletId] = useState<WalletId | null>(null);
  // Akış başına TEK consumerRefCode — tekrar denemede aynı değer gider.
  const consumerRefCode = useRef(createUuid());
  const presaleStarted = useRef(false);

  // Presale ekrana girişte bir kez çağrılır (kart seçimi tamamlandı → adım 4).
  useEffect(() => {
    if (presaleStarted.current) {
      return;
    }
    presaleStarted.current = true;
    presale.mutate(
      { code, codeType, cardId },
      {
        onSuccess: (response) => {
          // WalletId, dönen ProductId'ye göre backend'de önerilir (1→Resto, 3→Gift).
          setWalletId(response.suggestedWalletId);
        },
      },
    );
  }, [presale, code, codeType, cardId]);

  const card = cardsQuery.data?.items.find((item) => item.id === cardId) ?? null;
  const info = presale.data;

  const handlePay = () => {
    if (info === undefined || walletId === null) {
      return;
    }
    saleConfirm.mutate(
      {
        transactionId: info.transactionId,
        saleRefCode: info.saleRefCode,
        cardId,
        walletId,
        amount: info.requestAmount,
        consumerRefCode: consumerRefCode.current,
      },
      {
        onSuccess: (response) => {
          navigation.replace('PaySuccess', {
            receipt: {
              // Metropol confirm yanıtında mağaza adı dönmez — presale'den taşınır
              // (API_CONTRACT §7 notu).
              merchantName: response.merchantName ?? info.merchantName,
              merchantNo: response.merchantNo,
              terminalNo: response.terminalNo,
              approvalNo: response.approvalNo,
              maskedCardNo: response.maskedCardNo,
              amount: response.amount,
              date: response.date,
              walletId,
            },
          });
        },
      },
    );
  };

  // ── Başarısız ödeme görünümü (inline; mutation/anahtar korunur) ──
  if (saleConfirm.isError) {
    return (
      <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
        <View style={[styles.failWrap, { padding: theme.spacing.xl, gap: theme.spacing.md }]}>
          <View
            style={[
              styles.failCircle,
              { backgroundColor: theme.colors.danger, borderRadius: 999 },
            ]}
          >
            <Text style={{ color: theme.colors.card, fontSize: 34, fontWeight: '800' }}>✕</Text>
          </View>
          <Text style={{ fontSize: theme.fontSize.xl + 2, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.pay.failTitle')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {getMetropolErrorMessage(saleConfirm.error, t('metropol.pay.failGeneric'))}
          </Text>
          <View style={[styles.fullWidth, { marginTop: theme.spacing.lg, gap: theme.spacing.md }]}>
            {/* Tekrar Dene: AYNI Idempotency-Key + AYNI consumerRefCode ile */}
            <PrimaryButton
              label={t('metropol.pay.retry')}
              onPress={handlePay}
              loading={saleConfirm.isPending}
            />
            <Pressable
              onPress={() => navigation.popToTop()}
              accessibilityRole="button"
              style={styles.centerSelf}
            >
              <Text style={{ color: theme.colors.ink2, fontWeight: '700', fontSize: theme.fontSize.md }}>
                {t('metropol.pay.cancel')}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.pay.confirmTitle')} onBack={() => navigation.goBack()} />
      {presale.isPending || presale.isIdle ? (
        <View style={[styles.centered, { padding: theme.spacing.xl }]}>
          <ActivityIndicator color={theme.colors.brand} />
          <Text
            style={{
              color: theme.colors.ink2,
              fontSize: theme.fontSize.sm,
              marginTop: theme.spacing.md,
            }}
          >
            {t('metropol.pay.presaleLoading')}
          </Text>
        </View>
      ) : presale.isError ? (
        <View style={[styles.centered, { padding: theme.spacing.xl, gap: theme.spacing.md }]}>
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: theme.fontSize.md,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            {getMetropolErrorMessage(presale.error, t('common.genericError'))}
          </Text>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('common.back')}</Text>
          </Pressable>
        </View>
      ) : info !== undefined ? (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
          {/* banner: tutar + mağaza + ürün */}
          <View
            style={{
              backgroundColor: theme.colors.brand,
              paddingVertical: theme.spacing.xl,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.card, fontSize: theme.fontSize.sm, fontWeight: '600' }}>
              {t('metropol.pay.amountToPay')}
            </Text>
            <Text style={{ color: theme.colors.card, fontSize: 44, fontWeight: '800' }}>
              {formatMoney(info.requestAmount)} ₺
            </Text>
            <Text
              style={{
                color: theme.colors.card,
                fontSize: theme.fontSize.sm,
                fontWeight: '600',
                opacity: 0.9,
                marginTop: theme.spacing.xs,
              }}
            >
              {info.merchantName} · {info.productName}
            </Text>
          </View>

          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
            {/* seçili kart */}
            {card !== null ? (
              <CardPickRow
                holderName={card.holderName}
                maskedCardNo={card.maskedCardNo}
                selected
                onPress={() => navigation.goBack()}
              />
            ) : null}

            {/* cüzdan seçimi */}
            <View>
              <Text
                style={{
                  fontSize: theme.fontSize.sm,
                  fontWeight: '700',
                  color: theme.colors.ink2,
                  marginBottom: theme.spacing.md,
                  letterSpacing: 0.2,
                }}
              >
                {t('metropol.pay.walletPickLabel')}
              </Text>
              <View style={{ gap: theme.spacing.sm + 2 }}>
                {SELECTABLE_WALLET_IDS.map((id) => {
                  const accent = walletAccent(id, theme);
                  const active = walletId === id;
                  const balance =
                    balanceQuery.data?.wallets.find((wallet) => wallet.walletId === id)?.balance ??
                    null;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setWalletId(id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.walletRow,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: active ? accent : theme.colors.line,
                          borderRadius: theme.radius.md,
                          gap: theme.spacing.md,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.walletRadio,
                          { borderColor: active ? accent : theme.colors.line },
                        ]}
                      >
                        {active ? (
                          <View style={[styles.walletRadioDot, { backgroundColor: accent }]} />
                        ) : null}
                      </View>
                      <View style={styles.flex1}>
                        <Text
                          style={{
                            fontSize: theme.fontSize.md,
                            fontWeight: '700',
                            color: theme.colors.ink,
                          }}
                        >
                          {t(walletLabelKey(id))}
                        </Text>
                        <Text
                          style={{
                            fontSize: theme.fontSize.sm,
                            color: theme.colors.ink2,
                            marginTop: theme.spacing.xs / 2,
                          }}
                        >
                          {balance !== null
                            ? t('metropol.pay.walletAvailable', { amount: formatMoney(balance) })
                            : '—'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <PrimaryButton
              label={t('metropol.pay.payButton', { amount: formatMoney(info.requestAmount) })}
              onPress={handlePay}
              disabled={walletId === null}
              loading={saleConfirm.isPending}
            />
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  fullWidth: { width: '100%' },
  centered: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  centerSelf: { alignSelf: 'center', padding: 8 },
  failWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  failCircle: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  walletRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 2 },
  walletRadio: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletRadioDot: { width: 11, height: 11, borderRadius: 999 },
});
