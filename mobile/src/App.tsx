/** Uygulama kökü — provider hiyerarşisi + navigasyon. */
import '@/localization';

import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { RootNavigator } from '@/navigation/RootNavigator';
import { AuthProvider } from '@/store/authStore';
import { ThemeProvider } from '@/theme/ThemeProvider';

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
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
