/**
 * Video oynatma (PRD §6.3, prototip screens-home.jsx > Video).
 * Oynatıcı react-native-video ile (guard'lı: modül yüklenemezse thumbnail
 * placeholder kalır). onProgress ile ilerleme izlenir; süre eşiği (%90)
 * geçilince izleme OTOMATİK olarak completed=true ile bir kez backend'e
 * yazılır (POST /home/videos/{id}/watch, kullanıcı bazlı — PRD §6.5).
 * Manuel "İzlendi olarak işaretle" butonu fallback olarak kalır; ekrandan
 * çıkarken son ilerleme completed=false ile gönderilir (kaldığı yer).
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
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
import { videoModule } from '@/utils/nativeModules';

type Props = NativeStackScreenProps<HomeStackParamList, 'VideoPlayer'>;

/** İzlendi eşiği — sürenin %90'ı izlenince otomatik completed=true (PRD §6.3). */
const WATCH_COMPLETED_RATIO = 0.9;

/** Guard'lı oynatıcı bileşeni — modül yüklenemediyse null (placeholder gösterilir). */
const VideoPlayer = videoModule !== null ? videoModule.default : null;

export function VideoPlayerScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  // Ayrı GET /home/videos/{id} ucu yok; video, liste sorgusunun cache'inden bulunur
  // (prototipte de store.videos.find ile aynı yaklaşım).
  const videos = useVideos();
  const watchVideo = useWatchVideo(id);

  const video = videos.data?.items.find((item) => item.id === id);

  // Son bilinen oynatma konumu (sn) — çıkışta completed=false ile gönderilir.
  const progressRef = useRef(0);
  // completed=true yalnızca BİR KEZ gönderilir (otomatik eşik ya da manuel buton).
  const completedSentRef = useRef(false);

  const videoWatched = video?.watched === true;
  useEffect(() => {
    if (videoWatched) {
      // Zaten izlendiyse ne otomatik completed ne de çıkış ilerlemesi gönderilir
      // (completed=false upsert'i izlendi durumunu geriletmesin).
      completedSentRef.current = true;
    }
  }, [videoWatched]);

  // Ekrandan çıkarken kaldığı yeri backend'e yaz (completed=false) — PRD §6.3.
  const { mutate: mutateWatch } = watchVideo;
  useEffect(() => {
    return () => {
      const progressSeconds = Math.floor(progressRef.current);
      if (!completedSentRef.current && progressSeconds > 0) {
        mutateWatch({ progressSeconds, completed: false });
      }
    };
  }, [mutateWatch]);

  const handleProgress = (currentTime: number) => {
    progressRef.current = currentTime;
    if (video === undefined || completedSentRef.current) {
      return;
    }
    if (video.durationSeconds > 0 && currentTime >= video.durationSeconds * WATCH_COMPLETED_RATIO) {
      completedSentRef.current = true;
      mutateWatch({ progressSeconds: Math.floor(currentTime), completed: true });
    }
  };

  const handleMarkWatched = () => {
    if (video === undefined) {
      return;
    }
    completedSentRef.current = true;
    mutateWatch({ progressSeconds: video.durationSeconds, completed: true });
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
          {VideoPlayer !== null && video.url !== '' ? (
            /* Gerçek oynatıcı — controls açık, başlangıçta duraklatılmış. */
            <View
              style={[
                styles.playerWrap,
                {
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.navy,
                  overflow: 'hidden',
                },
              ]}
            >
              <VideoPlayer
                source={{ uri: video.url }}
                style={styles.playerArea}
                controls
                paused
                resizeMode="contain"
                onProgress={(event) => handleProgress(event.currentTime)}
              />
            </View>
          ) : (
            /* Oynatıcı modülü yok (eski native build) — thumbnail placeholder kalır. */
            <>
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
            </>
          )}

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
