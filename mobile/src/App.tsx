/** Uygulama kökü — provider hiyerarşisi + navigasyon. */
import '@/localization';

import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { useMe } from '@/hooks/useMe';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AuthProvider, useAuth } from '@/store/authStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

/**
 * Runtime white-label tema (TODO 1.10): login sonrası GET /me yanıtındaki
 * tenant.branding ThemeProvider'a uygulanır; çıkışta statik fallback'e dönülür.
 * TODO(Faz sonrası — firma kodu girişi): login ÖNCESİ tema için anonim
 * GET /tenants/{code}/branding ucu hazır; firma kodu ekranı gelince bağlanacak.
 */
function TenantBrandingLoader() {
  const { isAuthenticated } = useAuth();
  const { setServerBranding } = useTheme();
  const me = useMe(isAuthenticated);

  useEffect(() => {
    setServerBranding(isAuthenticated ? (me.data?.tenant.branding ?? null) : null);
  }, [isAuthenticated, me.data, setServerBranding]);

  return null;
}

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <TenantBrandingLoader />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
