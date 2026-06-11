/**
 * Kupon & hediye çeki listesi (PRD §7.3 — ilk sürüm yalnız listeleme; itfa/kullanım
 * akışı sonraki sürümde, PRD §17.4). Prototipteki gradyan kart düzeni tek renk
 * marka zemini olarak taşındı (gradyan kütüphanesi eklemeden).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useCoupons, useGiftCards } from '@/hooks/useBenefits';
import type { BenefitsStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<BenefitsStackParamList, 'BenefitItems'>;

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function BenefitItemsScreen({ navigation, route }: Props) {
  const { kind } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();

  const coupons = useCoupons();
  const giftCards = useGiftCards();
  const query = kind === 'coupons' ? coupons : giftCards;
  const title = t(kind === 'coupons' ? 'benefits.coupons.title' : 'benefits.giftcards.title');

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />

      {query.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : query.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
          <Pressable onPress={() => void query.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={query.data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
              {t('benefits.empty')}
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.colors.brand, borderRadius: theme.radius.lg },
              ]}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.cardMonogram,
                    { backgroundColor: theme.colors.card, borderRadius: theme.radius.md },
                  ]}
                >
                  <Text style={{ color: theme.colors.brand, fontWeight: '800', fontSize: 18 }}>
                    {item.brand.charAt(0)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardBrand, { fontSize: theme.fontSize.md }]}>
                {item.title}
              </Text>
              <Text style={styles.cardAmount}>{item.amount} ₺</Text>
              <Text style={[styles.cardExpiry, { fontSize: theme.fontSize.sm }]}>
                {t('benefits.expires')}: {formatExpiry(item.expiresAt)}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center', gap: 8, marginTop: 32 },
  card: { padding: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardMonogram: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  // Marka zemini üzerinde sabit beyaz metin — kontrast için bilinçli (tema zemini değil).
  cardBrand: { color: '#FFFFFF', fontWeight: '700', opacity: 0.95 },
  cardAmount: { color: '#FFFFFF', fontWeight: '800', fontSize: 32, letterSpacing: -1 },
  cardExpiry: { color: '#FFFFFF', opacity: 0.9, marginTop: 12 },
});
