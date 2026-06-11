/** Yan Haklar stack'i (PRD §7): grid → kampanya liste/detay → kupon/çek listeleri. */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BenefitItemsScreen } from '@/screens/Benefits/BenefitItemsScreen';
import { BenefitsScreen } from '@/screens/Benefits/BenefitsScreen';
import { CampaignDetailScreen } from '@/screens/Benefits/CampaignDetailScreen';
import { CampaignListScreen } from '@/screens/Benefits/CampaignListScreen';

import type { BenefitsStackParamList } from './types';

const Stack = createNativeStackNavigator<BenefitsStackParamList>();

export function BenefitsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BenefitsGrid" component={BenefitsScreen} />
      <Stack.Screen name="CampaignList" component={CampaignListScreen} />
      <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
      <Stack.Screen name="BenefitItems" component={BenefitItemsScreen} />
    </Stack.Navigator>
  );
}
