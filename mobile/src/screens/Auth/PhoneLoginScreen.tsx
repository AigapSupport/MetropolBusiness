/** Telefon girişi (PRD §5.2) — gerçek form + POST /auth/otp/send Faz 1.2'de. */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneLogin'>;

export function PhoneLoginScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen titleKey="auth.phoneTitle">
      <PrimaryButton label={t('common.continue')} onPress={() => navigation.navigate('Otp')} />
    </PlaceholderScreen>
  );
}
