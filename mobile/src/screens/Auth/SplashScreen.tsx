/** Splash (PRD §5.2) — firma logosu Faz 1.10'da tenant temasından gelecek. */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const SPLASH_DELAY_MS = 800;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('PhoneLogin');
    }, SPLASH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [navigation]);

  return <PlaceholderScreen titleKey="auth.splashTitle" />;
}
