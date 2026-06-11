/**
 * Keşfet (PRD §8.5, prototip screens-metropol-misc.jsx): üye işyeri haritası + pinler
 * + filtre barı + arama + mağaza kartları + pin detayı (Yol Tarifi / Ara / Geri Bildirim).
 * Harita react-native-maps GUARD'lıdır: modül native build'de yoksa liste görünümü kalır
 * (uygulama çökmez). Yol Tarifi/Ara, Linking ile native modülsüz çalışır.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Merchant } from '@shared/metropol';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useMerchantFeedback, useMerchants } from '@/hooks/useMerchants';
import { mapsModule } from '@/utils/nativeModules';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MetropolStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MetropolStackParamList, 'Explore'>;

/** Sektör filtre çipleri (API_CONTRACT §9: 0=Restoran/Market, 1=Giyim, 2=Hepsi). */
const SECTORS = [
  { id: 2, key: 'all' },
  { id: 0, key: 'food' },
  { id: 1, key: 'clothing' },
] as const;

export function ExploreScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [sectorId, setSectorId] = useState<number>(2);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Merchant | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const merchants = useMerchants(sectorId);
  const feedback = useMerchantFeedback();

  const filtered = useMemo(() => {
    const items = merchants.data?.items ?? [];
    const active = items.filter((m) => m.activeFlag === 1);
    const term = search.trim().toLocaleLowerCase('tr');
    if (term === '') {
      return active;
    }
    return active.filter(
      (m) =>
        m.signboardName.toLocaleLowerCase('tr').includes(term) ||
        m.city.toLocaleLowerCase('tr').includes(term) ||
        m.district.toLocaleLowerCase('tr').includes(term),
    );
  }, [merchants.data, search]);

  function openDirections(merchant: Merchant): void {
    // Native harita modülü gerektirmez — cihazın harita uygulamasını açar.
    void Linking.openURL(`https://maps.google.com/?q=${merchant.lat},${merchant.lng}`);
  }

  function call(merchant: Merchant): void {
    if (merchant.telNo !== '') {
      void Linking.openURL(`tel:${merchant.telNo}`);
    }
  }

  function submitFeedback(): void {
    if (selected === null || feedbackText.trim() === '') {
      return;
    }
    feedback.mutate(
      { code: selected.merchantCode, message: feedbackText.trim() },
      {
        onSuccess: () => {
          setFeedbackText('');
          setFeedbackOpen(false);
        },
      },
    );
  }

  const MapView = mapsModule?.default ?? null;
  const Marker = mapsModule?.Marker ?? null;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('explore.title')} onBack={() => navigation.goBack()} />

      <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('explore.searchPlaceholder')}
          placeholderTextColor={theme.colors.ink3}
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 10,
            color: theme.colors.ink,
          }}
        />
        <View style={styles.chips}>
          {SECTORS.map((sector) => (
            <Pressable
              key={sector.id}
              onPress={() => setSectorId(sector.id)}
              accessibilityRole="button"
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: sectorId === sector.id ? theme.colors.brand : theme.colors.card,
              }}
            >
              <Text
                style={{
                  color: sectorId === sector.id ? '#FFFFFF' : theme.colors.ink,
                  fontWeight: '700',
                  fontSize: theme.fontSize.sm,
                }}
              >
                {t(`explore.sectors.${sector.key}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {merchants.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : merchants.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
          <Pressable onPress={() => void merchants.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {MapView !== null && Marker !== null && filtered.length > 0 ? (
            <View style={[styles.map, { borderRadius: theme.radius.lg, margin: theme.spacing.lg }]}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: Number(filtered[0].lat) || 41.01,
                  longitude: Number(filtered[0].lng) || 28.97,
                  latitudeDelta: 0.2,
                  longitudeDelta: 0.2,
                }}
              >
                {/* Pin yoğunluğu: ilk 100 pin; kümeleme kütüphanesi Faz 3 performans turunda. */}
                {filtered.slice(0, 100).map((merchant) => (
                  <Marker
                    key={merchant.merchantCode}
                    coordinate={{
                      latitude: Number(merchant.lat) || 0,
                      longitude: Number(merchant.lng) || 0,
                    }}
                    title={merchant.signboardName}
                    description={merchant.sector}
                    onPress={() => setSelected(merchant)}
                  />
                ))}
              </MapView>
            </View>
          ) : (
            <View
              style={{
                marginHorizontal: theme.spacing.lg,
                marginTop: theme.spacing.md,
                backgroundColor: theme.colors.navySoft,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
              }}
            >
              <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
                {t('explore.mapUnavailable')}
              </Text>
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.merchantCode}
            contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}
            ListEmptyComponent={
              <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
                {t('explore.empty')}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelected(item)}
                accessibilityRole="button"
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                }}
              >
                <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>
                  {item.signboardName}
                </Text>
                <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
                  {item.sector} · {item.district}/{item.city}
                </Text>
              </Pressable>
            )}
          />
        </>
      )}

      {selected !== null ? (
        <View
          style={[
            styles.detail,
            {
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.sm,
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <Text style={{ color: theme.colors.ink, fontWeight: '800', fontSize: 17, flex: 1 }}>
              {selected.signboardName}
            </Text>
            <Pressable
              onPress={() => {
                setSelected(null);
                setFeedbackOpen(false);
              }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={{ color: theme.colors.ink3, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
            {selected.saleAddress}
          </Text>
          {selected.telNo !== '' ? (
            <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}>
              {selected.telNo}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Pressable
              onPress={() => openDirections(selected)}
              accessibilityRole="button"
              style={[styles.detailButton, { backgroundColor: theme.colors.brand }]}
            >
              <Text style={styles.detailButtonText}>{t('explore.directions')}</Text>
            </Pressable>
            {selected.telNo !== '' ? (
              <Pressable
                onPress={() => call(selected)}
                accessibilityRole="button"
                style={[styles.detailButton, { backgroundColor: theme.colors.navy }]}
              >
                <Text style={styles.detailButtonText}>{t('explore.call')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setFeedbackOpen((open) => !open)}
              accessibilityRole="button"
              style={[
                styles.detailButton,
                { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.brand },
              ]}
            >
              <Text style={[styles.detailButtonText, { color: theme.colors.brand }]}>
                {t('explore.feedback')}
              </Text>
            </Pressable>
          </View>

          {feedbackOpen ? (
            <View style={{ gap: theme.spacing.sm }}>
              <TextInput
                value={feedbackText}
                onChangeText={setFeedbackText}
                placeholder={t('explore.feedbackPlaceholder')}
                placeholderTextColor={theme.colors.ink3}
                multiline
                style={{
                  backgroundColor: theme.colors.bg,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  color: theme.colors.ink,
                  minHeight: 70,
                }}
              />
              <Pressable
                onPress={submitFeedback}
                disabled={feedback.isPending || feedbackText.trim() === ''}
                accessibilityRole="button"
                style={[
                  styles.detailButton,
                  {
                    backgroundColor: theme.colors.success,
                    opacity: feedback.isPending || feedbackText.trim() === '' ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={styles.detailButtonText}>
                  {feedback.isPending ? t('common.loading') : t('explore.feedbackSend')}
                </Text>
              </Pressable>
              {feedback.isSuccess ? (
                <Text style={{ color: theme.colors.success, fontSize: theme.fontSize.sm }}>
                  {t('explore.feedbackThanks')}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center', gap: 8, marginTop: 32 },
  chips: { flexDirection: 'row', gap: 8 },
  map: { height: 220, overflow: 'hidden' },
  detail: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 12,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center' },
  detailButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Renkli zeminlerde sabit beyaz buton metni (kontrast).
  detailButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
