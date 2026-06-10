/**
 * Duyuru detayı (PRD §6.1 — duyuru kartına tıklanınca açılır).
 * Kapak görseli + kaynak rozeti (firma/platform — kaynak ayrımı korunur, PRD §6.5)
 * + başlık + yayın tarihi + metin. Veri GET /home/announcements/{id}'den.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAnnouncementDetail } from '@/hooks/useHome';
import type { HomeStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<HomeStackParamList, 'AnnouncementDetail'>;

/** ISO tarihini cihaz yereline göre kısa biçimde gösterir (yalnız sunum). */
function formatPublishedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}

export function AnnouncementDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const detail = useAnnouncementDetail(id);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('announcementDetail.title')} onBack={() => navigation.goBack()} />

      {detail.isPending ? (
        <ActivityIndicator
          color={theme.colors.brand}
          style={{ marginTop: theme.spacing.xl }}
        />
      ) : detail.isError ? (
        <View style={[styles.statusBox, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.md }}>
            {t('home.sectionError')}
          </Text>
          <Pressable
            onPress={() => {
              void detail.refetch();
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text
              style={{ color: theme.colors.brand, fontWeight: '700', fontSize: theme.fontSize.md }}
            >
              {t('home.retry')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {detail.data.coverUrl !== null ? (
            <Image
              source={{ uri: detail.data.coverUrl }}
              style={[styles.cover, { borderRadius: theme.radius.md }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.cover,
                { borderRadius: theme.radius.md, backgroundColor: theme.colors.navySoft },
              ]}
            />
          )}

          <View style={{ marginTop: theme.spacing.lg }}>
            <Badge
              label={t(
                detail.data.source === 'company'
                  ? 'home.announcements.sourceCompany'
                  : 'home.announcements.sourcePlatform',
              )}
              variant={detail.data.source === 'company' ? 'brand' : 'navy'}
            />
          </View>

          <Text
            style={{
              fontSize: theme.fontSize.xl,
              fontWeight: '800',
              color: theme.colors.ink,
              marginTop: theme.spacing.md,
              lineHeight: 28,
            }}
          >
            {detail.data.title}
          </Text>

          {detail.data.publishedAt !== null ? (
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.ink3,
                marginTop: theme.spacing.xs,
              }}
            >
              {formatPublishedAt(detail.data.publishedAt)}
            </Text>
          ) : null}

          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              lineHeight: 24,
              marginTop: theme.spacing.lg,
            }}
          >
            {detail.data.body}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center' },
  cover: { width: '100%', height: 200 },
});
