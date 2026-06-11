/**
 * Kart Detayı (PRD §8.3, prototip screens-metropol-cards.jsx > CardDetail).
 * Üstte kart görseli (CardVisual), altında iki yerel sekme (kütüphanesiz tab state):
 *  - Bakiyeler: cüzdan bazında bakiye kartları (TOPLAM/RESTORAN/MARKET, useBalance);
 *    yanıt stale ise "Son güncelleme: {asOf}" uyarı satırı (BalanceResponse.asOf/stale)
 *    + son 5 işlem (useRecentTransactions + TxRow).
 *  - İşlemler: Bakiye Transferi / İşlem Geçmişi / Kart Kullanım Ayarları (Faz 2.5
 *    rozeti, placeholder) / Kartı Sil (mevcut Alert onayı, başarıda geri dön).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoneyString } from '@shared/common';

import { ScreenHeader } from '@/components/ScreenHeader';
import {
  useBalance,
  useCards,
  useDeleteCard,
  useRecentTransactions,
} from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateTime } from '@/utils/datetime';
import { formatMoney } from '@/utils/money';
import { clipboardModule } from '@/utils/nativeModules';

import { CardVisual } from '../components/CardVisual';
import { TxRow } from '../components/TxRow';
import { MARKET_WALLET_ID, RESTAURANT_WALLET_ID } from '../wallets';

type Props = NativeStackScreenProps<MetropolStackParamList, 'CardDetail'>;

type DetailTab = 'balances' | 'actions';
const DETAIL_TABS: DetailTab[] = ['balances', 'actions'];

interface BalanceCardProps {
  label: string;
  amount: MoneyString | null;
  accent: string;
  loading: boolean;
  /** TOPLAM kartı tam genişlik, cüzdan kartları yan yana. */
  wide?: boolean;
}

/** Cüzdan bazında bakiye kartı (ana ekrandaki BalancePill'in detay yerleşimi). */
function BalanceCard({ label, amount, accent, loading, wide = false }: BalanceCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.balanceCard,
        wide ? styles.balanceCardWide : null,
        { backgroundColor: theme.colors.card, borderTopColor: accent, borderRadius: theme.radius.md },
      ]}
    >
      <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '800', color: accent }}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={accent} style={{ marginVertical: theme.spacing.sm }} />
      ) : (
        <Text
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: '800',
            color: theme.colors.ink,
            marginTop: theme.spacing.sm,
          }}
        >
          {amount !== null ? `${formatMoney(amount)} ₺` : '—'}
        </Text>
      )}
      <Text
        style={{
          fontSize: theme.fontSize.xs + 1,
          color: theme.colors.ink2,
          marginTop: theme.spacing.xs / 2,
        }}
      >
        {t('metropol.balance.available')}
      </Text>
    </View>
  );
}

interface ActionRowProps {
  glyph: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Pasif satır rozeti — "Faz 2.5" placeholder'ı (TransferMenu deseninden). */
  badge?: string;
  danger?: boolean;
  last?: boolean;
}

/** İşlemler sekmesi satırı (TransferMenuScreen > MenuRow deseni). */
function ActionRow({
  glyph,
  title,
  subtitle,
  onPress,
  disabled = false,
  badge,
  danger = false,
  last = false,
}: ActionRowProps) {
  const { theme } = useTheme();
  // Tehlikeli aksiyon zemini — danger token'ından hex-alpha türetilir (CardVisual deseni).
  const iconBg = danger ? `${theme.colors.danger}22` : theme.colors.brandSoft;
  const titleColor = danger ? theme.colors.danger : theme.colors.ink;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.actionRow,
        {
          gap: theme.spacing.md,
          borderBottomColor: theme.colors.line2,
          borderBottomWidth: last ? 0 : 1,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBg, borderRadius: theme.radius.sm }]}>
        <Text
          style={{
            fontSize: theme.fontSize.lg,
            color: danger ? theme.colors.danger : theme.colors.brand,
          }}
        >
          {glyph}
        </Text>
      </View>
      <View style={styles.flex1}>
        <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
          <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: titleColor }}>
            {title}
          </Text>
          {badge !== undefined ? (
            <View
              style={{
                backgroundColor: theme.colors.navySoft,
                borderRadius: 999,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '700', color: theme.colors.navy }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.ink2,
            marginTop: theme.spacing.xs / 2,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.ink3 }}>›</Text>
    </Pressable>
  );
}

export function CardDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardsQuery = useCards();
  const deleteCard = useDeleteCard();

  const cards = cardsQuery.data?.items ?? [];
  const cardIndex = cards.findIndex((item) => item.id === route.params.cardId);
  const card = cardIndex >= 0 ? cards[cardIndex] : null;
  const cardId = card?.id ?? null;

  const balanceQuery = useBalance(cardId);
  const recentQuery = useRecentTransactions(cardId);

  const [tab, setTab] = useState<DetailTab>('balances');

  // Kopyalama geri bildirimi — ana ekrandaki kısa süreli rozet deseni.
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = (maskedCardNo: string) => {
    // Maskesiz kart no istemciye hiç gelmez (CLAUDE.md §2.4); maskeli değer kopyalanır.
    if (clipboardModule === null) {
      return;
    }
    clipboardModule.default.setString(maskedCardNo);
    setCopied(true);
    if (copyTimer.current !== null) {
      clearTimeout(copyTimer.current);
    }
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (card === null) {
      return;
    }
    // Onay diyaloğu (PRD §8.8) — ana ekrandaki silme akışıyla aynı; başarıda geri dönülür.
    Alert.alert(
      t('metropol.deleteCard.title'),
      t('metropol.deleteCard.message', { cardNo: card.maskedCardNo }),
      [
        { text: t('metropol.deleteCard.cancel'), style: 'cancel' },
        {
          text: t('metropol.deleteCard.confirm'),
          style: 'destructive',
          onPress: () => {
            deleteCard.mutate(card.id, {
              onSuccess: () => navigation.goBack(),
              onError: () => {
                Alert.alert(t('metropol.deleteCard.errorTitle'), t('common.genericError'));
              },
            });
          },
        },
      ],
    );
  };

  const wallets = balanceQuery.data?.wallets ?? [];
  const restaurantBalance =
    wallets.find((wallet) => wallet.walletId === RESTAURANT_WALLET_ID)?.balance ?? null;
  const marketBalance =
    wallets.find((wallet) => wallet.walletId === MARKET_WALLET_ID)?.balance ?? null;
  const balanceLoading = balanceQuery.isPending || balanceQuery.isRefetching;
  const balanceStale = balanceQuery.data?.stale === true;
  const balanceAsOf = balanceQuery.data?.asOf ?? null;

  const recentItems = recentQuery.data?.items ?? [];

  const panel = {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    overflow: 'hidden' as const,
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.cardDetail.title')} onBack={() => navigation.goBack()} />
      {cardsQuery.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : cardsQuery.isError ? (
        <View style={[styles.centered, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
            {t('metropol.cardsError')}
          </Text>
          <Pressable onPress={() => void cardsQuery.refetch()} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : card === null ? (
        <View style={[styles.centered, { padding: theme.spacing.xl }]}>
          <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.md, textAlign: 'center' }}>
            {t('metropol.cardDetail.notFound')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
          }}
        >
          {/* kart görseli — slider'daki ile aynı bileşen; silme İşlemler sekmesinde */}
          <CardVisual
            holderName={card.holderName}
            maskedCardNo={card.maskedCardNo}
            index={Math.max(cardIndex, 0)}
            onCopy={clipboardModule !== null ? () => handleCopy(card.maskedCardNo) : undefined}
          />
          {copied ? (
            <View
              style={{
                alignSelf: 'center',
                backgroundColor: theme.colors.successSoft,
                borderRadius: 999,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                marginTop: theme.spacing.sm,
              }}
            >
              <Text style={{ color: theme.colors.success, fontSize: theme.fontSize.sm, fontWeight: '700' }}>
                {t('metropol.card.copied')}
              </Text>
            </View>
          ) : null}

          {/* iki sekme — yerel state, kütüphane yok (prototip Segmented karşılığı) */}
          <View style={[styles.tabRow, { gap: theme.spacing.sm, marginTop: theme.spacing.lg }]}>
            {DETAIL_TABS.map((value) => {
              const active = tab === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setTab(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.tabChip,
                    {
                      borderColor: active ? theme.colors.brand : theme.colors.line,
                      backgroundColor: active ? theme.colors.brandSoft : theme.colors.card,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: '700',
                      color: active ? theme.colors.brand : theme.colors.ink2,
                    }}
                  >
                    {t(`metropol.cardDetail.tab_${value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'balances' ? (
            <>
              {/* stale uyarısı — Metropol erişilemedi, değerler son bilinen snapshot'tan */}
              {balanceStale ? (
                <View
                  style={{
                    backgroundColor: theme.colors.navySoft,
                    borderRadius: theme.radius.sm,
                    padding: theme.spacing.md,
                    marginTop: theme.spacing.lg,
                  }}
                >
                  <Text style={{ color: theme.colors.navy, fontSize: theme.fontSize.sm, fontWeight: '600' }}>
                    {t('metropol.cardDetail.staleNotice', {
                      date: balanceAsOf !== null ? formatDateTime(balanceAsOf) : '—',
                    })}
                  </Text>
                </View>
              ) : null}

              {/* cüzdan bazında bakiye kartları */}
              <View style={[styles.balanceGrid, { gap: theme.spacing.md, marginTop: theme.spacing.lg }]}>
                <BalanceCard
                  label={t('metropol.balance.total')}
                  amount={balanceQuery.data?.totalBalance ?? null}
                  accent={theme.colors.navy}
                  loading={balanceLoading}
                  wide
                />
                <BalanceCard
                  label={t('metropol.balance.restaurant')}
                  amount={restaurantBalance}
                  accent={theme.colors.brand}
                  loading={balanceLoading}
                />
                <BalanceCard
                  label={t('metropol.balance.market')}
                  amount={marketBalance}
                  accent={theme.colors.success}
                  loading={balanceLoading}
                />
              </View>

              {/* son 5 işlem */}
              <View style={[styles.sectionHeader, { marginTop: theme.spacing.xl }]}>
                <Text style={{ fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.ink }}>
                  {t('metropol.recent.title')}
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('History', { cardId: card.id })}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={{ color: theme.colors.brand, fontWeight: '700', fontSize: theme.fontSize.sm }}>
                    {t('metropol.recent.all')}
                  </Text>
                </Pressable>
              </View>
              <View style={[panel, { marginTop: theme.spacing.md }]}>
                {recentQuery.isPending ? (
                  <ActivityIndicator
                    color={theme.colors.brand}
                    style={{ marginVertical: theme.spacing.lg }}
                  />
                ) : recentQuery.isError ? (
                  <Text
                    style={{
                      color: theme.colors.ink2,
                      fontSize: theme.fontSize.sm,
                      padding: theme.spacing.lg,
                    }}
                  >
                    {t('metropol.recent.error')}
                  </Text>
                ) : recentItems.length === 0 ? (
                  <Text
                    style={{
                      color: theme.colors.ink3,
                      fontSize: theme.fontSize.sm,
                      padding: theme.spacing.lg,
                    }}
                  >
                    {t('metropol.recent.empty')}
                  </Text>
                ) : (
                  recentItems.map((item, index) => (
                    <TxRow
                      key={item.transactionId}
                      item={item}
                      last={index === recentItems.length - 1}
                    />
                  ))
                )}
              </View>
            </>
          ) : (
            <>
              {/* karta ait aksiyonlar (PRD §8.3 sekme 2) */}
              <View style={[panel, { marginTop: theme.spacing.lg }]}>
                <ActionRow
                  glyph="⇄"
                  title={t('metropol.actions.transfer')}
                  subtitle={t('metropol.actions.transferSub')}
                  onPress={() => navigation.navigate('TransferMenu')}
                />
                <ActionRow
                  glyph="↺"
                  title={t('metropol.actions.history')}
                  subtitle={t('metropol.actions.historySub')}
                  onPress={() => navigation.navigate('History', { cardId: card.id })}
                />
                {/* Kart kullanım ayarları — Faz 2.5'te gelecek, şimdilik pasif placeholder */}
                <ActionRow
                  glyph="⚙"
                  title={t('metropol.cardDetail.usageSettings')}
                  subtitle={t('metropol.cardDetail.usageSettingsSub')}
                  disabled
                  badge={t('metropol.cardDetail.phaseBadge')}
                  last
                />
              </View>
              <View style={[panel, { marginTop: theme.spacing.lg }]}>
                <ActionRow
                  glyph="🗑"
                  title={t('metropol.cardDetail.deleteTitle')}
                  subtitle={t('metropol.cardDetail.deleteSub')}
                  onPress={handleDelete}
                  disabled={deleteCard.isPending}
                  danger
                  last
                />
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  centered: { alignItems: 'center', marginTop: 24 },
  tabRow: { flexDirection: 'row' },
  tabChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  balanceCard: { flexGrow: 1, flexBasis: '47%', padding: 16, borderTopWidth: 3 },
  balanceCardWide: { flexBasis: '100%' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  actionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
