/**
 * Video oynatma (PRD §6.3, prototip screens-home.jsx > Video).
 * TODO(Faz 1.x — native): gerçek oynatıcı react-native-video ile gelecek; native modül
 * kurulumu bu ortamda doğrulanamadığından (LESSONS.md RN native kaydı) video alanı
 * şimdilik placeholder'dır (thumbnail + oynat ikonu). Otomatik ilerleme/izleme simülasyonu
 * YOKTUR; "İzlendi olarak işaretle" butonu POST /home/videos/{id}/watch ile kullanıcı
 * bazlı izleme durumunu backend'e yazar (completed=true → izlendi, PRD §6.5).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useVideos, useWatchVideo } from '@/hooks/useHome';
import type { HomeStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDurationMmSs } from '@/utils/duration';

type Props = NativeStackScreenProps<HomeStackParamList, 'VideoPlayer'>;

export function VideoPlayerScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  // Ayrı GET /home/videos/{id} ucu yok; video, liste sorgusunun cache'inden bulunur
  // (prototipte de store.videos.find ile aynı yaklaşım).
  const videos = useVideos();
  const watchVideo = useWatchVideo(id);

  const video = videos.data?.items.find((item) => item.id === id);

  const handleMarkWatched = () => {
    if (video === undefined) {
      return;
    }
    watchVideo.mutate({ progressSeconds: video.durationSeconds, completed: true });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('video.title')} onBack={() => navigation.goBack()} />

      {videos.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : videos.isError ? (
        <View style={[styles.statusBox, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.md }}>
            {t('home.sectionError')}
          </Text>
          <Pressable
            onPress={() => {
              void videos.refetch();
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
      ) : video === undefined ? (
        <View style={[styles.statusBox, { padding: theme.spacing.lg }]}>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.md }}>
            {t('video.notFound')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          {/* Oynatıcı placeholder'ı — thumbnail + oynat ikonu (üstteki native TODO). */}
          <View style={styles.playerWrap}>
            {video.thumbnailUrl !== null ? (
              <Image
                source={{ uri: video.thumbnailUrl }}
                style={[styles.playerArea, { borderRadius: theme.radius.md }]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.playerArea,
                  { borderRadius: theme.radius.md, backgroundColor: theme.colors.navySoft },
                ]}
              />
            )}
            <View style={styles.playOverlay}>
              <View style={[styles.playCircle, { backgroundColor: theme.colors.card }]}>
                <Text style={{ color: theme.colors.navy, fontSize: theme.fontSize.xl }}>▶</Text>
              </View>
            </View>
          </View>
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.ink3,
              textAlign: 'center',
              marginTop: theme.spacing.sm,
            }}
          >
            {t('video.playerPlaceholder')}
          </Text>

          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
            {video.watched ? (
              <Badge label={`✓ ${t('video.watched')}`} variant="success" soft={false} />
            ) : video.mandatory ? (
              <Badge label={t('home.videos.mandatory')} variant="brand" />
            ) : null}

            <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
              {video.title}
            </Text>

            <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2 }}>
              {t('video.durationLabel', { duration: formatDurationMmSs(video.durationSeconds) })}
            </Text>

            {video.description !== null ? (
              <Text
                style={{
                  fontSize: theme.fontSize.md,
                  color: theme.colors.ink2,
                  lineHeight: 24,
                  marginTop: theme.spacing.sm,
                }}
              >
                {video.description}
              </Text>
            ) : null}
          </View>

          {watchVideo.isError ? (
            <Text
              style={{
                marginTop: theme.spacing.md,
                textAlign: 'center',
                color: theme.colors.danger,
                fontSize: theme.fontSize.sm,
              }}
            >
              {t('video.markError')}
            </Text>
          ) : null}

          {!video.watched ? (
            <View style={{ marginTop: theme.spacing.xl }}>
              <PrimaryButton
                label={t('video.markWatched')}
                onPress={handleMarkWatched}
                loading={watchVideo.isPending}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center' },
  playerWrap: { position: 'relative' },
  playerArea: { width: '100%', height: 210 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
