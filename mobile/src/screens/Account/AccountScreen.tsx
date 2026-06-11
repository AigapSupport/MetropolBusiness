/**
 * Hesabım (PRD §11) — hamburger menüden erişilecek; profil/ayarlar Faz 2.5'te bağlanacak.
 * Şimdilik placeholder + biyometrik giriş toggle'ı (PRD §5.1): tercih kalıcıdır
 * (authStore → Keychain/fallback); cihazda sensör yoksa toggle devre dışıdır.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useAuth } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';
import { isBiometricSensorAvailable } from '@/utils/biometrics';

export function AccountScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { biometricEnabled, setBiometricEnabled } = useAuth();
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

  return (
    <PlaceholderScreen titleKey="account.title">
      <View
        style={[
          styles.settingRow,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
          },
        ]}
      >
        <Text style={{ fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.ink }}>
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
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.ink3,
            textAlign: 'center',
            marginTop: theme.spacing.sm,
          }}
        >
          {t('account.biometricUnavailable')}
        </Text>
      ) : null}
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    minWidth: 280,
  },
});
