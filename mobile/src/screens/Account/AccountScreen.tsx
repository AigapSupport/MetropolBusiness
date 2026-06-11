/**
 * Hesabım menüsü (PRD §11.1, prototip screens-profile.jsx): Profilim, Kartvizitim,
 * Kampanya/Duyuru İzinleri, Dil, Güvenlik (biyometrik toggle inline), Hesabımı Sil.
 * PIN/ResetPin ve Kart Kullanım Ayarları (DeactivateCard IVR) backend proxy'leri
 * eklenince bağlanacak [~ TODO 2.5].
 */
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { meApi } from '@/api/me';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/store/authStore';
import { isBiometricSensorAvailable } from '@/utils/biometrics';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountMenu'>;

export function AccountScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { biometricEnabled, setBiometricEnabled, logout } = useAuth();
  const [sensorAvailable, setSensorAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isBiometricSensorAvailable().then((available) => {
      if (!cancelled) {
        setSensorAvailable(available);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const deleteAccount = useMutation({
    mutationFn: () => meApi.deleteMe(),
    onSuccess: () => logout(),
  });

  function confirmDelete(): void {
    Alert.alert(t('account.delete.title'), t('account.delete.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.delete.confirm'),
        style: 'destructive',
        onPress: () => deleteAccount.mutate(),
      },
    ]);
  }

  function menuRow(label: string, onPress: () => void, danger = false) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={[
          styles.row,
          { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: theme.spacing.lg },
        ]}
      >
        <Text
          style={{
            color: danger ? theme.colors.danger : theme.colors.ink,
            fontWeight: '600',
            flex: 1,
          }}
        >
          {label}
        </Text>
        <Text style={{ color: theme.colors.ink3, fontSize: 18 }}>›</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('account.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
        {menuRow(t('account.menu.profile'), () => navigation.navigate('ProfileEdit'))}
        {menuRow(t('account.menu.businessCard'), () => navigation.navigate('BusinessCard'))}
        {menuRow(t('account.menu.preferences'), () => navigation.navigate('Preferences'))}
        {menuRow(t('account.menu.language'), () => navigation.navigate('Language'))}

        {/* Güvenlik: biyometrik giriş (PRD §5.1); PIN/ResetPin proxy'si eklenince genişler. */}
        <View
          style={[
            styles.row,
            { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, padding: theme.spacing.lg },
          ]}
        >
          <Text style={{ color: theme.colors.ink, fontWeight: '600', flex: 1 }}>
            {t('account.biometricToggle')}
          </Text>
          <Switch
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
            disabled={!sensorAvailable}
            trackColor={{ true: theme.colors.brand, false: theme.colors.line }}
            accessibilityLabel={t('account.biometricToggle')}
          />
        </View>
        {!sensorAvailable ? (
          <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink3 }}>
            {t('account.biometricUnavailable')}
          </Text>
        ) : null}

        {menuRow(t('account.menu.deleteAccount'), confirmDelete, true)}

        {deleteAccount.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {t('home.sectionError')}
          </Text>
        ) : null}

        <Pressable
          onPress={logout}
          accessibilityRole="button"
          style={{ alignItems: 'center', padding: theme.spacing.md }}
        >
          <Text style={{ color: theme.colors.ink2, fontWeight: '700' }}>
            {t('account.logout')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
