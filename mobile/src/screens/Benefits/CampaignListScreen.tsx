/**
 * Kampanya listesi (PRD §7.2, prototip screens-benefits.jsx > CampaignList):
 * marka monogramı + başlık + ok satır kartları; kategori filtresiyle açılır.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useCampaigns } from '@/hooks/useBenefits';
import type { BenefitsStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<BenefitsStackParamList, 'CampaignList'>;

export function CampaignListScreen({ navigation, route }: Props) {
  const { categoryCode, title } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const campaigns = useCampaigns(categoryCode);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />

      {campaigns.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : campaigns.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
          <Pressable onPress={() => void campaigns.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={campaigns.data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
              {t('benefits.empty')}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('CampaignDetail', { id: item.id })}
              accessibilityRole="button"
              style={[
                styles.row,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  gap: theme.spacing.md,
                },
              ]}
            >
              <View
                style={[
                  styles.monogram,
                  { backgroundColor: `${theme.colors.brand}22`, borderRadius: theme.radius.md },
                ]}
              >
                <Text style={{ color: theme.colors.brand, fontWeight: '800', fontSize: 17 }}>
                  {item.title.charAt(0)}
                </Text>
              </View>
              <Text
                style={[styles.rowTitle, { color: theme.colors.ink, fontSize: theme.fontSize.md }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text style={{ color: theme.colors.ink3, fontSize: 18 }}>›</Text>
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
  row: { flexDirection: 'row', alignItems: 'center' },
  monogram: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontWeight: '700' },
});
