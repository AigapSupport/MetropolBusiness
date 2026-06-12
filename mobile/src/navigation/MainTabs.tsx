/**
 * Alt tab bar — 5 sekme (PRD §4). Açılış sekmesi Metropol (prototip nav.jsx ile uyumlu).
 * NOT: Ortadaki Metropol sekmesinin yükseltilmiş FAB tasarımı Faz 1'de gelecek;
 * şimdilik standart tab. İkonlar Feather (prototipteki lucide setiyle birebir adlar).
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Feather from 'react-native-vector-icons/Feather';

import { BenefitsStack } from '@/navigation/BenefitsStack';
import { ChatStack } from '@/navigation/ChatStack';
import { OtherStack } from '@/navigation/OtherStack';
import { useTheme } from '@/theme/ThemeProvider';

import { HomeStack } from './HomeStack';
import { MetropolStack } from './MetropolStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Home: 'home',
  Benefits: 'gift',
  Metropol: 'credit-card',
  Chat: 'message-circle',
  Other: 'more-horizontal',
};

function tabIcon(route: keyof MainTabParamList) {
  return ({ color, size }: { color: string; size: number }) => (
    <Feather name={TAB_ICONS[route]} color={color} size={size} />
  );
}

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
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: t('tabs.home'), tabBarIcon: tabIcon('Home') }}
      />
      <Tab.Screen
        name="Benefits"
        component={BenefitsStack}
        options={{ tabBarLabel: t('tabs.benefits'), tabBarIcon: tabIcon('Benefits') }}
      />
      {/* Metropol kendi stack'ini taşır: ana ekran + kart ekle + harcama + transfer (PRD §8). */}
      <Tab.Screen
        name="Metropol"
        component={MetropolStack}
        options={{ tabBarLabel: t('tabs.metropol'), tabBarIcon: tabIcon('Metropol') }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{ tabBarLabel: t('tabs.chat'), tabBarIcon: tabIcon('Chat') }}
      />
      <Tab.Screen
        name="Other"
        component={OtherStack}
        options={{ tabBarLabel: t('tabs.other'), tabBarIcon: tabIcon('Other') }}
      />
    </Tab.Navigator>
  );
}
