/**
 * Kök navigatör — oturum yoksa AuthStack, varsa MainTabs (PRD §4-5).
 * Yeni kullanıcı (isNewUser) profil tamamlanana dek AuthStack'te kalır;
 * açılışta storage'dan yükleme sürerken (isRestoring) Splash görünür.
 */
import { useAuth } from '@/store/authStore';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const { isAuthenticated, isNewUser } = useAuth();

  return isAuthenticated && !isNewUser ? <MainTabs /> : <AuthStack />;
}
