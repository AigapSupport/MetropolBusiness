/**
 * İşlem Geçmişi (PRD §8.6, screens-metropol-misc.jsx > History).
 * Satır: tip ikonu + maskeli isim + onay no + tutar (yeşil/kırmızı) + tarih-saat (TxRow).
 * Tarih aralığı filtresi: hazır aralık çipleri (7/30/90 gün/tümü) — startDate/endDate
 * sorgu parametrelerine çevrilir. Sayfalama: useInfiniteQuery + onEndReached.
 * Kart parametresiz açılırsa (örn. transfer menüsünden) ilk kart seçilir; birden çok
 * kart varsa üstte kart seçim çipleri gösterilir.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useCards, useTransactionsInfinite } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { isoDaysAgo } from '@/utils/datetime';

import { TxRow } from '../components/TxRow';

type Props = NativeStackScreenProps<MetropolStackParamList, 'History'>;

/** Hazır tarih aralıkları (gün); null = tümü. */
const RANGE_PRESETS = [7, 30, 90, null] as const;
type RangePreset = (typeof RANGE_PRESETS)[number];

function presetLabelKey(preset: RangePreset): string {
  return preset === null ? 'metropol.history.rangeAll' : `metropol.history.rangeDays_${preset}`;
}

export function HistoryScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardsQuery = useCards();
  const cards = cardsQuery.data?.items ?? [];

  // 'all' = tüm kartların birleşik geçmişi (GET /metropol/transactions, KARAR 2026-06-12).
  const [selectedCardId, setSelectedCardId] = useState<string>(route.params.cardId ?? 'all');
  const cardId = selectedCardId;

  const [preset, setPreset] = useState<RangePreset>(null);
  const range = preset === null ? {} : { startDate: isoDaysAgo(preset) };

  const transactions = useTransactionsInfinite(cardId, range);
  const items = transactions.data?.pages.flatMap((page) => page.items) ?? [];

  const handleEndReached = () => {
    if (transactions.hasNextPage && !transactions.isFetchingNextPage) {
      void transactions.fetchNextPage();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.actions.history')} onBack={() => navigation.goBack()} />

      {/* kart seçimi: "Tümü" + kart başına bir çip (kart no çipe TAM sığar) */}
      {cards.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              gap: theme.spacing.sm,
            }}
          >
            {[{ id: 'all', label: t('metropol.history.rangeAll') } as const,
              ...cards.map((card) => ({ id: card.id, label: card.maskedCardNo })),
            ].map((chip) => {
              const active = cardId === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setSelectedCardId(chip.id)}
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.sm + 2,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: active ? theme.colors.brand : theme.colors.line,
                    backgroundColor: active ? theme.colors.brandSoft : theme.colors.card,
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: theme.fontSize.sm,
                      fontWeight: '700',
                      // Maskeli kart no rakam+yıldız: eşit aralıklı rakam çipe düzgün oturur.
                      fontVariant: ['tabular-nums'],
                      color: active ? theme.colors.brand : theme.colors.ink2,
                    }}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* tarih aralığı filtresi */}
      <View
        style={[
          styles.filterRow,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.sm,
          },
        ]}
      >
        {RANGE_PRESETS.map((value) => {
          const active = preset === value;
          return (
            <Pressable
              key={String(value)}
              onPress={() => setPreset(value)}
              accessibilityRole="button"
              style={[
                styles.filterChip,
                {
                  borderColor: active ? theme.colors.brand : theme.colors.line,
                  backgroundColor: active ? theme.colors.brandSoft : theme.colors.card,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.fontSize.xs + 1,
                  fontWeight: '700',
                  color: active ? theme.colors.brand : theme.colors.ink2,
                }}
              >
                {t(presetLabelKey(value))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {transactions.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : transactions.isError ? (
        <View style={[styles.centered, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
            {t('metropol.recent.error')}
          </Text>
          <Pressable onPress={() => void transactions.refetch()} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.centered, { padding: theme.spacing.xl }]}>
          <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.md, textAlign: 'center' }}>
            {t('metropol.history.empty')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.transactionId)}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
          }}
          renderItem={({ item, index }) => (
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderTopLeftRadius: index === 0 ? theme.radius.md : 0,
                borderTopRightRadius: index === 0 ? theme.radius.md : 0,
                borderBottomLeftRadius: index === items.length - 1 ? theme.radius.md : 0,
                borderBottomRightRadius: index === items.length - 1 ? theme.radius.md : 0,
                overflow: 'hidden',
              }}
            >
              <TxRow item={item} last={index === items.length - 1} />
            </View>
          )}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          refreshing={transactions.isRefetching}
          onRefresh={() => void transactions.refetch()}
          ListFooterComponent={
            transactions.isFetchingNextPage ? (
              <ActivityIndicator color={theme.colors.brand} style={{ marginVertical: theme.spacing.lg }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  centered: { alignItems: 'center', marginTop: 24 },
  filterRow: { flexDirection: 'row' },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});
