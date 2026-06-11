/**
 * Biyometrik giriş sarmalı (PRD §5.1) — react-native-biometrics üzerinden
 * sensör sorgusu + sistem doğrulama diyaloğu. Tüm çağrılar guard'lıdır:
 * modül yüklenemediyse (nativeModules null) ya da native çağrı fırlatırsa
 * "sensör yok / doğrulama başarısız" olarak davranılır; uygulama çökmez.
 * Kullanım: authStore (açılış restore + tercih önerisi) ve AccountScreen toggle'ı.
 */
import { biometricsModule } from './nativeModules';

/** Tek örnek — modül yoksa null; constructor native çağrı yapmaz, güvenlidir. */
const rnBiometrics = biometricsModule !== null ? new biometricsModule.default() : null;

/** Cihazda kullanılabilir bir biyometrik sensör (FaceID/TouchID/parmak izi) var mı? */
export async function isBiometricSensorAvailable(): Promise<boolean> {
  if (rnBiometrics === null) {
    return false;
  }
  try {
    const result = await rnBiometrics.isSensorAvailable();
    return result.available;
  } catch {
    return false;
  }
}

/**
 * Sistem biyometrik doğrulama diyaloğunu açar.
 * true = doğrulama başarılı; false = başarısız/iptal/modül yok.
 */
export async function promptBiometric(
  promptMessage: string,
  cancelButtonText: string,
): Promise<boolean> {
  if (rnBiometrics === null) {
    return false;
  }
  try {
    const result = await rnBiometrics.simplePrompt({ promptMessage, cancelButtonText });
    return result.success;
  } catch {
    return false;
  }
}
