/**
 * Metropol ana ekranı (PRD §8.1, prototip screens-metropol-home.jsx > Metropol).
 * Kart slider (yatay FlatList) → bakiye kartları (TOPLAM/RESTORAN/MARKET) →
 * aksiyon listesi → seçili kartın son 5 işlemi. Hiç kart yoksa "Kart Ekle" CTA'sı.
 * Bakiye yenile ikonu refresh=true ile backend cache'ini atlar (PRD §17.7).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoneyString } from '@shared/common';
import type { CardSummary } from '@shared/metropol';

import {
  useBalance,
  useCards,
  useDeleteCard,
  useRecentTransactions,
  useRefreshBalance,
} from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatMoney } from '@/utils/money';

import { CardVisual } from './components/CardVisual';
import { TxRow } from './components/TxRow';
import { MARKET_WALLET_ID, RESTAURANT_WALLET_ID } from './wallets';

type Props = NativeStackScreenProps<MetropolStackParamList, 'MetropolHome'>;

const PAGE_WIDTH = Dimensions.get('window').width;
const PAGE_PADDING = 18;

/** Slider sonundaki "Kart Ekle" boş kartı (prototip AddCardTile). */
function AddCardTile({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.addTile,
        { borderColor: theme.colors.line, borderRadius: theme.radius.lg, gap: theme.spacing.md },
      ]}
    >
      <View
        style={[
          styles.addTileCircle,
          { backgroundColor: theme.colors.brandSoft, borderRadius: 999 },
        ]}
      >
        <Text style={{ fontSize: theme.fontSize.xl, color: theme.colors.brand, fontWeight: '700' }}>
          +
        </Text>
      </View>
      <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.navy }}>
        {t('metropol.addCardTile')}
      </Text>
    </Pressable>
  );
}

interface BalancePillProps {
  label: string;
  amount: MoneyString | null;
  accent: string;
  loading: boolean;
  onRefresh?: () => void;
}

/** Bakiye kartı — TOPLAM/RESTORAN/MARKET (prototip BalanceCards öğesi). */
function BalancePill({ label, amount, accent, loading, onRefresh }: BalancePillProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.balancePill,
        { backgroundColor: theme.colors.card, borderTopColor: accent, borderRadius: theme.radius.md },
      ]}
    >
      <View style={styles.balanceHeader}>
        <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '800', color: accent }}>
          {label}
        </Text>
        {onRefresh !== undefined ? (
          <Pressable
            onPress={onRefresh}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('metropol.balance.refresh')}
          >
            <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.ink3 }}>⟳</Text>
          </Pressable>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator color={accent} style={{ marginVertical: theme.spacing.sm }} />
      ) : (
        <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
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

/** Aksiyon listesi — Harcama Yap / Keşfet / İşlem Geçmişi / Bakiye Transferi. */
function ActionGrid({ onAction }: { onAction: (action: 'pay' | 'explore' | 'history' | 'transfer') => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const actions = [
    { id: 'pay' as const, glyph: '▣', accent: theme.colors.brand },
    { id: 'explore' as const, glyph: '◎', accent: theme.colors.navy },
    { id: 'history' as const, glyph: '↺', accent: theme.colors.navy },
    { id: 'transfer' as const, glyph: '⇄', accent: theme.colors.success },
  ];
  return (
    <View style={[styles.actionGrid, { gap: theme.spacing.md }]}>
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={() => onAction(action.id)}
          accessibilityRole="button"
          style={[
            styles.actionCard,
            { backgroundColor: theme.colors.card, borderRadius: theme.radius.md },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.colors.brandSoft, borderRadius: theme.radius.sm },
            ]}
          >
            <Text style={{ fontSize: theme.fontSize.xl, color: action.accent }}>{action.glyph}</Text>
          </View>
          <View>
            <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}>
              {t(`metropol.actions.${action.id}`)}
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize.xs + 1,
                color: theme.colors.ink2,
                marginTop: theme.spacing.xs / 2,
              }}
            >
              {t(`metropol.actions.${action.id}Sub`)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function MetropolHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardsQuery = useCards();
  const deleteCard = useDeleteCard();
  const refreshBalance = useRefreshBalance();

  const cards = cardsQuery.data?.items ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedCard: CardSummary | null = cards[activeIndex] ?? cards[0] ?? null;
  const selectedCardId = selectedCard?.id ?? null;

  const balanceQuery = useBalance(selectedCardId);
  const recentQuery = useRecentTransactions(selectedCardId);

  // Kopyalama geri bildirimi — kısa süreli rozet (toast yerine; ek bağımlılık yok).
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = (maskedCardNo: string) => {
    // Maskesiz kart no istemciye hiç gelmez (CLAUDE.md §2.4); maskeli değer kopyalanır.
    // TODO(native): @react-native-clipboard/clipboard'a geçiş — core Clipboard deprecated.
    Clipboard.setString(maskedCardNo);
    setCopied(true);
    if (copyTimer.current !== null) {
      clearTimeout(copyTimer.current);
    }
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (card: CardSummary) => {
    // Onay diyaloğu (PRD §8.8) — onaydan sonra DELETE; başarıda liste invalidate edilir.
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
              onSuccess: () => setActiveIndex(0),
              onError: () => {
                Alert.alert(t('metropol.deleteCard.errorTitle'), t('common.genericError'));
              },
            });
          },
        },
      ],
    );
  };

  const handleSliderEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
    setActiveIndex(Math.max(0, Math.min(index, cards.length)));
  };

  const handleRefreshBalance = () => {
    if (selectedCardId !== null) {
      refreshBalance.mutate(selectedCardId);
    }
  };

  const handleAction = (action: 'pay' | 'explore' | 'history' | 'transfer') => {
    if (action === 'pay') {
      navigation.navigate('PayChoose');
    } else if (action === 'explore') {
      navigation.navigate('Explore');
    } else if (action === 'history') {
      navigation.navigate('History', { cardId: selectedCardId ?? undefined });
    } else {
      navigation.navigate('TransferMenu');
    }
  };

  const wallets = balanceQuery.data?.wallets ?? [];
  const restaurantBalance =
    wallets.find((wallet) => wallet.walletId === RESTAURANT_WALLET_ID)?.balance ?? null;
  const marketBalance =
    wallets.find((wallet) => wallet.walletId === MARKET_WALLET_ID)?.balance ?? null;
  const balanceLoading =
    balanceQuery.isPending || balanceQuery.isRefetching || refreshBalance.isPending;

  const recentItems = recentQuery.data?.items ?? [];
  const refreshing = cardsQuery.isRefetching;
  const handlePullRefresh = () => {
    void cardsQuery.refetch();
    void balanceQuery.refetch();
    void recentQuery.refetch();
  };

  // Slider verisi: kartlar + sondaki "Kart Ekle" boş kartı (id: __add).
  const sliderItems: Array<CardSummary | 'add'> = [...cards, 'add'];

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      {/* başlık */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.line2 },
        ]}
      >
        <View>
          <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
            {t('metropol.headerSub')}
          </Text>
          <Text style={{ fontSize: theme.fontSize.xl + 2, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.headerTitle')}
          </Text>
        </View>
        {copied ? (
          <View
            style={{
              backgroundColor: theme.colors.successSoft,
              borderRadius: 999,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <Text style={{ color: theme.colors.success, fontSize: theme.fontSize.sm, fontWeight: '700' }}>
              {t('metropol.card.copied')}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingVertical: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={theme.colors.brand}
          />
        }
      >
        {cardsQuery.isPending ? (
          <ActivityIndicator color={theme.colors.brand} style={{ marginVertical: theme.spacing.xl }} />
        ) : cardsQuery.isError ? (
          <View style={[styles.centered, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
            <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
              {t('metropol.cardsError')}
            </Text>
            <Pressable onPress={() => void cardsQuery.refetch()} accessibilityRole="button">
              <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>
                {t('home.retry')}
              </Text>
            </Pressable>
          </View>
        ) : cards.length === 0 ? (
          /* boş durum: hiç kart yok → Kart Ekle CTA (PRD §8.1) */
          <View style={{ paddingHorizontal: PAGE_PADDING, gap: theme.spacing.md }}>
            <AddCardTile onPress={() => navigation.navigate('AddCardNumber')} />
            <Text
              style={{
                textAlign: 'center',
                color: theme.colors.ink2,
                fontSize: theme.fontSize.sm,
                paddingHorizontal: theme.spacing.lg,
              }}
            >
              {t('metropol.emptySubtitle')}
            </Text>
          </View>
        ) : (
          <>
            {/* kart slider */}
            <FlatList
              horizontal
              data={sliderItems}
              keyExtractor={(item) => (item === 'add' ? '__add' : item.id)}
              renderItem={({ item, index }) => (
                <View style={{ width: PAGE_WIDTH, paddingHorizontal: PAGE_PADDING }}>
                  {item === 'add' ? (
                    <AddCardTile onPress={() => navigation.navigate('AddCardNumber')} />
                  ) : (
                    <CardVisual
                      holderName={item.holderName}
                      maskedCardNo={item.maskedCardNo}
                      index={index}
                      onRefresh={handleRefreshBalance}
                      onCopy={() => handleCopy(item.maskedCardNo)}
                      onDelete={() => handleDelete(item)}
                    />
                  )}
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              onMomentumScrollEnd={handleSliderEnd}
            />
            {/* sayfa noktaları */}
            <View style={[styles.dots, { gap: theme.spacing.sm - 2, marginTop: theme.spacing.md }]}>
              {sliderItems.map((item, index) => (
                <View
                  key={item === 'add' ? '__add' : item.id}
                  style={{
                    width: index === activeIndex ? 18 : 6,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor:
                      index === activeIndex ? theme.colors.brand : theme.colors.line,
                  }}
                />
              ))}
            </View>

            {/* bakiye kartları — TOPLAM / RESTORAN / MARKET (wallets'tan türetilir) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: PAGE_PADDING,
                gap: theme.spacing.md,
                marginTop: theme.spacing.lg,
              }}
            >
              <BalancePill
                label={t('metropol.balance.total')}
                amount={balanceQuery.data?.totalBalance ?? null}
                accent={theme.colors.navy}
                loading={balanceLoading}
                onRefresh={handleRefreshBalance}
              />
              <BalancePill
                label={t('metropol.balance.restaurant')}
                amount={restaurantBalance}
                accent={theme.colors.brand}
                loading={balanceLoading}
              />
              <BalancePill
                label={t('metropol.balance.market')}
                amount={marketBalance}
                accent={theme.colors.success}
                loading={balanceLoading}
              />
            </ScrollView>

            {/* aksiyonlar */}
            <View style={{ paddingHorizontal: PAGE_PADDING, marginTop: theme.spacing.lg }}>
              <ActionGrid onAction={handleAction} />
            </View>

            {/* son 5 işlem */}
            <View style={{ paddingHorizontal: PAGE_PADDING, marginTop: theme.spacing.xl }}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.ink }}>
                  {t('metropol.recent.title')}
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('History', { cardId: selectedCardId ?? undefined })}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={{ color: theme.colors.brand, fontWeight: '700', fontSize: theme.fontSize.sm }}>
                    {t('metropol.recent.all')}
                  </Text>
                </Pressable>
              </View>
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.md,
                  marginTop: theme.spacing.md,
                  overflow: 'hidden',
                }}
              >
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
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  centered: { alignItems: 'center' },
  addTile: {
    width: '100%',
    aspectRatio: 1.58,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileCircle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  balancePill: { width: 158, padding: 15, borderTopWidth: 3 },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  actionCard: { flexBasis: '47%', flexGrow: 1, padding: 15, gap: 10 },
  actionIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
