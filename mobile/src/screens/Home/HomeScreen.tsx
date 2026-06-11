/**
 * Ana Sayfa (PRD §6, prototip screens-home.jsx > Home).
 * Dikey akış: üst bar → Duyurular (yatay carousel) → Anketler → İzlenecek Videolar.
 * Veriler React Query'den (useHome); pull-to-refresh üç sorguyu birden yeniler.
 * Her bölümün yükleniyor/hata/boş durumu ayrı ele alınır (PRD §16).
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Announcement, SurveyListItem, Video } from '@shared/home';

import { Badge } from '@/components/Badge';
import { BrandLogo } from '@/components/BrandLogo';
import { useAnnouncements, useSurveys, useVideos } from '@/hooks/useHome';
import type { HomeStackParamList, RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDurationMmSs } from '@/utils/duration';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

/** Anket süresi tahmini: prototipteki ~soru/3 dk kuralı (screens-home.jsx). */
function estimateSurveyMinutes(questionCount: number): number {
  return Math.max(1, Math.ceil(questionCount / 3));
}

/** Üst bar — hamburger + firma logosu + sohbet/bildirim (prototip HomeHeader). */
function HomeHeader() {
  const { t } = useTranslation();
  // Kök stack navigasyonu: Hesabım ekranları MainTabs'in DIŞINDA, RootNavigator'dadır.
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.line2 },
      ]}
    >
      {/* Hamburger → Hesabım (PRD §11.1; kök stack'teki AccountMenu). */}
      <Pressable
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('home.menu')}
        onPress={() => rootNavigation.navigate('AccountMenu')}
      >
        <Text style={{ fontSize: theme.fontSize.xl, color: theme.colors.ink }}>☰</Text>
      </Pressable>
      <BrandLogo size={34} />
      <View style={[styles.headerRight, { gap: theme.spacing.md }]}>
        {/* TODO(Faz 2.3): sohbet kısayolu, TODO(Faz 3): bildirim merkezi — glif placeholder. */}
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('home.chatShortcut')}
        >
          <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.ink }}>✉</Text>
        </Pressable>
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('home.notifications')}
        >
          <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.ink }}>⚐</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Bölüm başlığı (prototip SectionTitle karşılığı). */
function SectionTitle({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        fontSize: theme.fontSize.lg,
        fontWeight: '800',
        color: theme.colors.ink,
        marginBottom: theme.spacing.md,
      }}
    >
      {label}
    </Text>
  );
}

interface SectionStatusProps {
  loading: boolean;
  error: boolean;
  empty: boolean;
  /** Boş durum metninin localization anahtarı (PRD §16 — boş durum). */
  emptyKey: string;
  onRetry: () => void;
  children: ReactNode;
}

/** Bölüm bazlı yükleniyor/hata/boş durumu — başarıda children gösterilir. */
function SectionStatus({ loading, error, empty, emptyKey, onRetry, children }: SectionStatusProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (loading) {
    return (
      <ActivityIndicator color={theme.colors.brand} style={{ marginVertical: theme.spacing.lg }} />
    );
  }
  if (error) {
    return (
      <View style={[styles.statusRow, { gap: theme.spacing.sm }]}>
        <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
          {t('home.sectionError')}
        </Text>
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
          <Text
            style={{ color: theme.colors.brand, fontWeight: '700', fontSize: theme.fontSize.sm }}
          >
            {t('home.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }
  if (empty) {
    return (
      <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.sm }}>{t(emptyKey)}</Text>
    );
  }
  return <>{children}</>;
}

/** Duyuru kartı — kapak + kaynak rozeti + başlık + kısa metin (carousel öğesi). */
function AnnouncementCard({
  announcement,
  onPress,
}: {
  announcement: Announcement;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isCompany = announcement.source === 'company';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.announcementCard,
        { backgroundColor: theme.colors.card, borderRadius: theme.radius.md },
      ]}
    >
      {announcement.coverUrl !== null ? (
        <Image
          source={{ uri: announcement.coverUrl }}
          style={styles.announcementCover}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.announcementCover, { backgroundColor: theme.colors.navySoft }]} />
      )}
      <View style={{ padding: theme.spacing.md + 2 }}>
        <Badge
          label={t(isCompany ? 'home.announcements.sourceCompany' : 'home.announcements.sourcePlatform')}
          variant={isCompany ? 'brand' : 'navy'}
        />
        <Text
          numberOfLines={2}
          style={{
            fontSize: theme.fontSize.md,
            fontWeight: '800',
            color: theme.colors.ink,
            marginTop: theme.spacing.sm,
          }}
        >
          {announcement.title}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.ink2,
            marginTop: theme.spacing.xs,
            lineHeight: 18,
          }}
        >
          {announcement.body}
        </Text>
      </View>
    </Pressable>
  );
}

/** Anket kartı — başlık + soru sayısı + tamamlandı rozeti / Katıl butonu. */
function SurveyCard({ survey, onPress }: { survey: SurveyListItem; onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={survey.completed}
      accessibilityRole="button"
      style={[
        styles.surveyCard,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md + 2,
          gap: theme.spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.surveyIcon,
          { backgroundColor: theme.colors.brandSoft, borderRadius: theme.radius.sm },
        ]}
      >
        <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.brand }}>▤</Text>
      </View>
      <View style={styles.flex1}>
        <Text
          numberOfLines={1}
          style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}
        >
          {survey.title}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.ink2,
            marginTop: theme.spacing.xs / 2,
          }}
        >
          {t('home.surveys.meta', {
            questions: survey.questionCount,
            minutes: estimateSurveyMinutes(survey.questionCount),
          })}
        </Text>
      </View>
      {survey.completed ? (
        <Badge label={t('home.surveys.completed')} variant="success" soft={false} />
      ) : (
        <View
          style={{
            backgroundColor: theme.colors.brandSoft,
            borderRadius: 999,
            paddingHorizontal: theme.spacing.md + 2,
            paddingVertical: theme.spacing.sm - 1,
          }}
        >
          <Text
            style={{ color: theme.colors.brand, fontWeight: '700', fontSize: theme.fontSize.sm }}
          >
            {t('home.surveys.join')}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Video kartı — thumbnail + süre (m:ss) + başlık + izlendi/izlenmedi rozeti. */
function VideoCard({ video, onPress }: { video: Video; onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.videoCard,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.md,
          padding: theme.spacing.sm + 2,
          gap: theme.spacing.md,
        },
      ]}
    >
      <View style={styles.videoThumbWrap}>
        {video.thumbnailUrl !== null ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={[styles.videoThumb, { borderRadius: theme.radius.sm }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.videoThumb,
              { borderRadius: theme.radius.sm, backgroundColor: theme.colors.navySoft },
            ]}
          />
        )}
        <View style={styles.videoPlayOverlay}>
          <View style={[styles.videoPlayCircle, { backgroundColor: theme.colors.card }]}>
            <Text style={{ color: theme.colors.navy, fontSize: theme.fontSize.sm }}>▶</Text>
          </View>
        </View>
        <View
          style={[
            styles.videoDuration,
            { backgroundColor: theme.colors.navy, borderRadius: theme.radius.sm / 2 },
          ]}
        >
          <Text style={{ color: theme.colors.card, fontSize: theme.fontSize.xs, fontWeight: '700' }}>
            {formatDurationMmSs(video.durationSeconds)}
          </Text>
        </View>
      </View>
      <View style={[styles.flex1, { gap: theme.spacing.xs }]}>
        {video.mandatory && !video.watched ? (
          <Badge label={t('home.videos.mandatory')} variant="brand" />
        ) : null}
        <Text
          numberOfLines={2}
          style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}
        >
          {video.title}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: '600',
            color: video.watched ? theme.colors.success : theme.colors.ink3,
          }}
        >
          {video.watched ? `✓ ${t('home.videos.watched')}` : t('home.videos.notWatched')}
        </Text>
      </View>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const announcements = useAnnouncements();
  const surveys = useSurveys();
  const videos = useVideos();

  // TODO(Faz 1.x): "Merhaba, {ad}" selamlaması GET /me bağlanınca eklenecek
  // (prototipteki profile.first — şu an istemcide kullanıcı adı yok).

  const refreshing = announcements.isRefetching || surveys.isRefetching || videos.isRefetching;
  const handleRefresh = () => {
    void announcements.refetch();
    void surveys.refetch();
    void videos.refetch();
  };

  const announcementItems = announcements.data?.items ?? [];
  const surveyItems = surveys.data?.items ?? [];
  const videoItems = videos.data?.items ?? [];

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{ paddingVertical: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.brand}
          />
        }
      >
        {/* Duyurular — yatay carousel (prototip: scroll-snap kartlar) */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SectionTitle label={t('home.announcements.title')} />
        </View>
        <SectionStatus
          loading={announcements.isPending}
          error={announcements.isError}
          empty={announcementItems.length === 0}
          emptyKey="home.announcements.empty"
          onRetry={() => {
            void announcements.refetch();
          }}
        >
          <FlatList
            horizontal
            data={announcementItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AnnouncementCard
                announcement={item}
                onPress={() => navigation.navigate('AnnouncementDetail', { id: item.id })}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              gap: theme.spacing.md,
            }}
          />
        </SectionStatus>

        {/* Anketler — dikey kart listesi */}
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl }}>
          <SectionTitle label={t('home.surveys.title')} />
          <SectionStatus
            loading={surveys.isPending}
            error={surveys.isError}
            empty={surveyItems.length === 0}
            emptyKey="home.surveys.empty"
            onRetry={() => {
              void surveys.refetch();
            }}
          >
            <View style={{ gap: theme.spacing.md }}>
              {surveyItems.map((survey) => (
                <SurveyCard
                  key={survey.id}
                  survey={survey}
                  onPress={() => navigation.navigate('SurveyFill', { id: survey.id })}
                />
              ))}
            </View>
          </SectionStatus>
        </View>

        {/* İzlenecek Videolar — dikey kart listesi */}
        <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.xl }}>
          <SectionTitle label={t('home.videos.title')} />
          <SectionStatus
            loading={videos.isPending}
            error={videos.isError}
            empty={videoItems.length === 0}
            emptyKey="home.videos.empty"
            onRetry={() => {
              void videos.refetch();
            }}
          >
            <View style={{ gap: theme.spacing.md }}>
              {videoItems.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPress={() => navigation.navigate('VideoPlayer', { id: video.id })}
                />
              ))}
            </View>
          </SectionStatus>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  announcementCard: { width: 280, overflow: 'hidden' },
  announcementCover: { width: '100%', height: 120 },
  surveyCard: { flexDirection: 'row', alignItems: 'center' },
  surveyIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  videoCard: { flexDirection: 'row', alignItems: 'center' },
  videoThumbWrap: { width: 110 },
  videoThumb: { width: 110, height: 70 },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
