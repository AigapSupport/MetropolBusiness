/** Giriş & onboarding stack'i (PRD §5). */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CompleteProfileScreen } from '@/screens/Auth/CompleteProfileScreen';
import { OtpScreen } from '@/screens/Auth/OtpScreen';
import { PhoneLoginScreen } from '@/screens/Auth/PhoneLoginScreen';
import { SplashScreen } from '@/screens/Auth/SplashScreen';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}
