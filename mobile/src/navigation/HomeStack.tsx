/** Ana Sayfa stack'i (PRD §6) — feed + duyuru detayı + anket doldurma + video oynatma. */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AnnouncementDetailScreen } from '@/screens/Home/AnnouncementDetailScreen';
import { HomeScreen } from '@/screens/Home/HomeScreen';
import { SurveyFillScreen } from '@/screens/Home/SurveyFillScreen';
import { VideoPlayerScreen } from '@/screens/Home/VideoPlayerScreen';

import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator initialRouteName="HomeFeed" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
      <Stack.Screen name="SurveyFill" component={SurveyFillScreen} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
    </Stack.Navigator>
  );
}
