/**
 * Kök navigatör — oturum yoksa AuthStack, varsa kök stack (MainTabs + Hesabım
 * ekranları; PRD §4-5, §11: hamburger → Hesabım). Yeni kullanıcı (isNewUser)
 * profil tamamlanana dek AuthStack'te kalır; açılışta storage'dan yükleme
 * sürerken (isRestoring) Splash görünür.
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AccountScreen } from '@/screens/Account/AccountScreen';
import { BusinessCardScreen } from '@/screens/Account/BusinessCardScreen';
import { LanguageScreen } from '@/screens/Account/LanguageScreen';
import { PreferencesScreen } from '@/screens/Account/PreferencesScreen';
import { ProfileEditScreen } from '@/screens/Account/ProfileEditScreen';
import { useAuth } from '@/store/authStore';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isNewUser } = useAuth();

  if (!isAuthenticated || isNewUser) {
    return <AuthStack />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="AccountMenu" component={AccountScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="BusinessCard" component={BusinessCardScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
    </Stack.Navigator>
  );
}
