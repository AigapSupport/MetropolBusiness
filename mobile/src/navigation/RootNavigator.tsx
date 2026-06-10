/** Kök navigatör — oturum yoksa AuthStack, varsa MainTabs (PRD §4-5). */
import { useAuth } from '@/store/authStore';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <MainTabs /> : <AuthStack />;
}
