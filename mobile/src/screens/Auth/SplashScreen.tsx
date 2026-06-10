/**
 * Splash (PRD §5.2) — firma logosu; oturum tokenStorage'dan yüklenene dek bekler.
 * Oturum varsa RootNavigator MainTabs'a geçer; yoksa telefon girişine yönlenir.
 * TODO(Faz 1.10): logo/marka adı tenant temasından (branding) gelecek.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import type { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/store/authStore';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

/** Logonun göz kırpmadan görünmesi için asgari bekleme. */
const SPLASH_DELAY_MS = 800;

export function SplashScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isRestoring, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isRestoring) {
      // Storage'dan oturum yüklemesi sürüyor — bekle (PRD §5.3 sessiz yenileme girişi).
      return;
    }
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        navigation.replace('PhoneLogin');
      }
      // Oturum varsa RootNavigator MainTabs'ı gösterir; burada gezinme gerekmez.
    }, SPLASH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isRestoring, isAuthenticated, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <BrandLogo size={76} />
      <Text
        style={{
          marginTop: theme.spacing.lg,
          fontSize: theme.fontSize.xl,
          fontWeight: '800',
          color: theme.colors.ink,
        }}
      >
        {t('auth.splashTitle')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
