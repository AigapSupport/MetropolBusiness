/**
 * Diğer sekmesi (PRD §10, prototip screens-other.jsx > Other): kullanıcının
 * segmentine atanmış modüllerin 2'li grid'i (GET /me/modules) + bilgi notu.
 * Görünürlük istemcide modül listesine göredir; YETKİ yine backend'de doğrulanır.
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

import { useMyModules, usePendingApprovals } from '@/hooks/useHr';
import type { OtherStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<OtherStackParamList, 'ModulesGrid'>;

/** Modül kodu → hedef ekran eşlemesi (platform tanımları, seed.sql ile aynı sözlük). */
const MODULE_SCREENS: Record<string, Exclude<keyof OtherStackParamList, 'ModulesGrid'>> = {
  leave_request: 'LeaveRequests',
  expense_request: 'ExpenseRequests',
  expense_approval: 'Approvals',
};

export function OtherScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const modules = useMyModules();

  const hasApproval =
    modules.data?.modules.some((module) => module.code === 'expense_approval') ?? false;
  const pending = usePendingApprovals(hasApproval);
  const pendingCount =
    (pending.expenses.data?.items.length ?? 0) + (pending.leaves.data?.items.length ?? 0);

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
          {t('other.subtitle')}
        </Text>
        <Text style={{ fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.ink }}>
          {t('tabs.other')}
        </Text>
      </View>

      {modules.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : modules.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
          <Pressable onPress={() => void modules.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={modules.data.modules}
          keyExtractor={(item) => item.code}
          numColumns={2}
          columnWrapperStyle={{ gap: theme.spacing.md }}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
              {t('other.empty')}
            </Text>
          }
          ListFooterComponent={
            <View
              style={{
                backgroundColor: theme.colors.navySoft,
                borderRadius: theme.radius.md,
                marginTop: theme.spacing.md,
                padding: theme.spacing.md,
              }}
            >
              <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, lineHeight: 18 }}>
                {t('other.info')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const target = MODULE_SCREENS[item.code];
            const badge = item.code === 'expense_approval' ? pendingCount : 0;
            return (
              <Pressable
                onPress={() => {
                  if (target !== undefined) {
                    navigation.navigate(target);
                  }
                }}
                accessibilityRole="button"
                style={[
                  styles.tile,
                  {
                    backgroundColor: theme.colors.card,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.md,
                    // Eşlemesi olmayan (yeni tanımlanmış) modül soluk görünür.
                    opacity: target === undefined ? 0.5 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.tileIcon,
                    { backgroundColor: `${theme.colors.brand}20`, borderRadius: theme.radius.md },
                  ]}
                >
                  <Text style={{ color: theme.colors.brand, fontWeight: '800', fontSize: 18 }}>
                    {item.name.charAt(0)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: theme.fontSize.md,
                    fontWeight: '800',
                    color: theme.colors.ink,
                    marginTop: theme.spacing.sm,
                  }}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                {badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: theme.colors.brand }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  statusBox: { alignItems: 'center', gap: 8, marginTop: 32 },
  tile: { flex: 1, minHeight: 120 },
  tileIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Marka zemini üzerinde sabit beyaz rozet metni (kontrast).
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
