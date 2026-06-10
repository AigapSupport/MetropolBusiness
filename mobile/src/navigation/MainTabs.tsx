/**
 * Alt tab bar — 5 sekme (PRD §4). Açılış sekmesi Metropol (prototip nav.jsx ile uyumlu).
 * NOT: Ortadaki Metropol sekmesinin yükseltilmiş FAB tasarımı Faz 1'de gelecek;
 * şimdilik standart tab. Sekme ikonları da Faz 1'de eklenecek.
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import { BenefitsScreen } from '@/screens/Benefits/BenefitsScreen';
import { ChatScreen } from '@/screens/Chat/ChatScreen';
import { OtherScreen } from '@/screens/Other/OtherScreen';
import { useTheme } from '@/theme/ThemeProvider';

import { HomeStack } from './HomeStack';
import { MetropolStack } from './MetropolStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Metropol"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.ink3,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.line,
        },
      }}
    >
      {/* Ana Sayfa kendi stack'ini taşır: feed + duyuru detayı + anket + video (PRD §6). */}
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: t('tabs.home') }} />
      <Tab.Screen
        name="Benefits"
        component={BenefitsScreen}
        options={{ tabBarLabel: t('tabs.benefits') }}
      />
      {/* Metropol kendi stack'ini taşır: ana ekran + kart ekle + harcama + transfer (PRD §8). */}
      <Tab.Screen
        name="Metropol"
        component={MetropolStack}
        options={{ tabBarLabel: t('tabs.metropol') }}
      />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: t('tabs.chat') }} />
      <Tab.Screen name="Other" component={OtherScreen} options={{ tabBarLabel: t('tabs.other') }} />
    </Tab.Navigator>
  );
}
