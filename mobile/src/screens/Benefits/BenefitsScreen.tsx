/**
 * Yan Haklar grid'i (PRD §7.1, prototip screens-benefits.jsx > Benefits):
 * 2'li kategori kartları — kapak şeridi + monogram rozeti + başlık.
 * Kategoriler platform admin tanımlıdır (GET /benefits/categories); kupon ve
 * hediye çeki kodları sabit uçlara, diğerleri kampanya listesine yönlenir.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BenefitCategory } from '@shared/benefits';
import { useBenefitCategories } from '@/hooks/useBenefits';
import type { BenefitsStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<BenefitsStackParamList, 'BenefitsGrid'>;

/** Sabit uçlu kategoriler — diğer tüm kodlar kampanya listesine kategori filtresiyle gider. */
const COUPON_CODES = new Set(['coupons', 'kuponlar']);
const GIFT_CODES = new Set(['giftcards', 'gift_cards', 'hediye_cekleri']);

export function BenefitsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const categories = useBenefitCategories();

  function open(category: BenefitCategory): void {
    if (COUPON_CODES.has(category.code)) {
      navigation.navigate('BenefitItems', { kind: 'coupons' });
    } else if (GIFT_CODES.has(category.code)) {
      navigation.navigate('BenefitItems', { kind: 'giftcards' });
    } else {
      navigation.navigate('CampaignList', { categoryCode: category.code, title: category.name });
    }
  }

  /** Kart kapak/monogram vurgusu — sırayla marka ve lacivert tonları (tema token'ları). */
  function accentFor(index: number): string {
    return index % 2 === 0 ? theme.colors.brand : theme.colors.navy;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
          {t('benefits.subtitle')}
        </Text>
        <Text style={{ fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.ink }}>
          {t('tabs.benefits')}
        </Text>
      </View>

      {categories.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : categories.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.md }}>
            {t('home.sectionError')}
          </Text>
          <Pressable onPress={() => void categories.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={categories.data.items}
          keyExtractor={(item) => item.code}
          numColumns={2}
          columnWrapperStyle={{ gap: theme.spacing.md }}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
              {t('benefits.empty')}
            </Text>
          }
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              style={[
                styles.tile,
                { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg },
              ]}
            >
              <View style={[styles.tileCover, { backgroundColor: `${accentFor(index)}22` }]}>
                <View
                  style={[
                    styles.tileMonogram,
                    { backgroundColor: theme.colors.card, borderRadius: theme.radius.md },
                  ]}
                >
                  <Text style={{ color: accentFor(index), fontWeight: '800', fontSize: 18 }}>
                    {item.name.charAt(0)}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  padding: theme.spacing.md,
                  fontSize: theme.fontSize.md,
                  fontWeight: '700',
                  color: theme.colors.ink,
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center', gap: 8, marginTop: 32 },
  tile: { flex: 1, overflow: 'hidden' },
  tileCover: { height: 88, justifyContent: 'flex-start' },
  tileMonogram: {
    width: 40,
    height: 40,
    margin: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
});
