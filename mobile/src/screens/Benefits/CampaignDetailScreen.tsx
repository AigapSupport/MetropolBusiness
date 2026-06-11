/**
 * Kampanya detayı (PRD §7.2, prototip screens-benefits.jsx > CampaignDetail):
 * büyük marka monogramı/logosu + başlık + açıklama + "Detaylı Bilgi Al" +
 * "Benzer Kampanyalar" yatay listesi (aynı kategoriden, backend hazırlar).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCampaignDetail } from '@/hooks/useBenefits';
import type { BenefitsStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<BenefitsStackParamList, 'CampaignDetail'>;

export function CampaignDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const detail = useCampaignDetail(id);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('benefits.detail.title')} onBack={() => navigation.goBack()} />

      {detail.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : detail.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
          <Pressable onPress={() => void detail.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
          <View style={[styles.cover, { backgroundColor: `${theme.colors.brand}22` }]}>
            {detail.data.brandLogoUrl !== null ? (
              <Image
                source={{ uri: detail.data.brandLogoUrl }}
                style={[styles.logo, { borderRadius: theme.radius.lg }]}
                resizeMode="contain"
              />
            ) : (
              <View
                style={[
                  styles.logo,
                  styles.logoFallback,
                  { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg },
                ]}
              >
                <Text style={{ color: theme.colors.brand, fontWeight: '800', fontSize: 26 }}>
                  {detail.data.title.charAt(0)}
                </Text>
              </View>
            )}
          </View>

          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <Text
              style={{
                fontSize: theme.fontSize.xl,
                fontWeight: '800',
                color: theme.colors.ink,
                marginTop: theme.spacing.lg,
                lineHeight: 28,
              }}
            >
              {detail.data.title}
            </Text>
            <Text
              style={{
                fontSize: theme.fontSize.md,
                color: theme.colors.ink2,
                lineHeight: 24,
                marginTop: theme.spacing.md,
              }}
            >
              {detail.data.body}
            </Text>

            {detail.data.detailUrl !== null ? (
              <View style={{ marginTop: theme.spacing.lg }}>
                <PrimaryButton
                  label={t('benefits.detail.cta')}
                  onPress={() => {
                    void Linking.openURL(detail.data.detailUrl as string);
                  }}
                />
              </View>
            ) : null}

            {detail.data.similar.length > 0 ? (
              <View style={{ marginTop: theme.spacing.xl }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.lg,
                    fontWeight: '800',
                    color: theme.colors.ink,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  {t('benefits.detail.similar')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                    {detail.data.similar.map((similar) => (
                      <Pressable
                        key={similar.id}
                        onPress={() => navigation.push('CampaignDetail', { id: similar.id })}
                        accessibilityRole="button"
                        style={[
                          styles.similarCard,
                          { backgroundColor: theme.colors.card, borderRadius: theme.radius.md },
                        ]}
                      >
                        <View style={[styles.similarCover, { backgroundColor: `${theme.colors.navy}18` }]} />
                        <Text
                          style={{
                            padding: theme.spacing.sm,
                            fontSize: theme.fontSize.sm,
                            fontWeight: '700',
                            color: theme.colors.ink,
                          }}
                          numberOfLines={2}
                        >
                          {similar.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center', gap: 8, marginTop: 32 },
  cover: { height: 150, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 76, height: 76 },
  logoFallback: { alignItems: 'center', justifyContent: 'center', elevation: 3 },
  similarCard: { width: 190, overflow: 'hidden' },
  similarCover: { height: 78 },
});
