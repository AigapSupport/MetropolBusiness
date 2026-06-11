/** Kampanya/Duyuru izinleri (PRD §11.2): bildirim toggle'ları — GET/PUT /me/preferences. */
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { meApi } from '@/api/me';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Preferences'>;

export function PreferencesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const preferences = useQuery({
    queryKey: ['me', 'preferences'],
    queryFn: () => meApi.getPreferences(),
  });

  const [campaign, setCampaign] = useState(true);
  const [announcement, setAnnouncement] = useState(true);

  useEffect(() => {
    if (preferences.data !== undefined) {
      setCampaign(preferences.data.campaignNotifications);
      setAnnouncement(preferences.data.announcementNotifications);
    }
  }, [preferences.data]);

  const save = useMutation({
    mutationFn: (next: { campaignNotifications: boolean; announcementNotifications: boolean }) =>
      meApi.updatePreferences(next),
  });

  function toggle(kind: 'campaign' | 'announcement', value: boolean): void {
    const next = {
      campaignNotifications: kind === 'campaign' ? value : campaign,
      announcementNotifications: kind === 'announcement' ? value : announcement,
    };
    setCampaign(next.campaignNotifications);
    setAnnouncement(next.announcementNotifications);
    save.mutate(next);
  }

  function row(label: string, value: boolean, onChange: (next: boolean) => void) {
    return (
      <View
        style={[
          styles.row,
          { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: theme.spacing.lg },
        ]}
      >
        <Text style={{ color: theme.colors.ink, fontWeight: '600', flex: 1 }}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: theme.colors.brand, false: theme.colors.line }}
          accessibilityLabel={label}
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('account.preferences.title')} onBack={() => navigation.goBack()} />
      {preferences.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : (
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          {row(t('account.preferences.campaign'), campaign, (next) => toggle('campaign', next))}
          {row(t('account.preferences.announcement'), announcement, (next) =>
            toggle('announcement', next),
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
