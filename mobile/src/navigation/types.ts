/**
 * Navigasyon param listeleri — Faz 1'de ekran parametreleri (örn. kampanya id) eklendikçe genişler.
 */

export type AuthStackParamList = {
  Splash: undefined;
  PhoneLogin: undefined;
  /** OTP ekranı — gönderim yanıtındaki referans ve sayaç süresiyle açılır. */
  Otp: { phone: string; otpRef: string; resendInSeconds: number };
  CompleteProfile: undefined;
};

/** Alt tab bar — 5 sekme (PRD §4). Metropol ortadaki ana sekmedir. */
export type MainTabParamList = {
  Home: undefined;
  Benefits: undefined;
  Metropol: undefined;
  Chat: undefined;
  Other: undefined;
};
