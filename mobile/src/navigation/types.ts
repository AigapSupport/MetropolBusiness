/**
 * Navigasyon param listeleri — Faz 1'de ekran parametreleri (örn. kampanya id) eklendikçe genişler.
 */

export type AuthStackParamList = {
  Splash: undefined;
  PhoneLogin: undefined;
  Otp: undefined;
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
