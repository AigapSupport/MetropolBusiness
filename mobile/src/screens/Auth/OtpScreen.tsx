/** OTP doğrulama (PRD §5.2) — kod kutuları + sayaç ve POST /auth/otp/verify Faz 1.2'de. */
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/store/authStore';

export function OtpScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();

  // TODO(Faz 1.2): OTP doğrulama yanıtındaki gerçek token'lar kullanılacak;
  // bu buton yalnızca navigasyon iskeletini denemek içindir.
  const handleDevLogin = () => {
    login({ accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' });
  };

  return (
    <PlaceholderScreen titleKey="auth.otpTitle">
      <PrimaryButton label={t('auth.devLogin')} onPress={handleDevLogin} />
    </PlaceholderScreen>
  );
}
