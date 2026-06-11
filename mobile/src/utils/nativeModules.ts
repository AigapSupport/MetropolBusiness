/**
 * Native modüllerin güvenli (koşullu) yüklenmesi — tokenStorage.ts'teki
 * react-native-keychain deseninin genelleştirilmiş hali.
 *
 * Neden: Metro bundle'da paket bulunsa bile cihazdaki native build eski
 * olabilir (modül linklenmemiş) ya da JS modülü require anında native köprüye
 * erişip fırlatabilir. require try/catch ile sarılır; modül yüklenemezse null
 * döner ve çağıran ekran placeholder/fallback davranışını korur — uygulama
 * ASLA çökmez.
 *
 * NOT: Metro yalnızca string literal require'ları çözebildiği için her modül
 * kendi try/catch bloğuyla AYRI yüklenir (ortak `loadModule(id)` yardımcı
 * fonksiyonu Metro'da "Invalid call" hatası verir — bundle doğrulamasında görüldü).
 */

// Metro runtime'ı global `require` sağlar; node tipleri eklenmediği için yerel bildirim.
declare const require: (moduleId: string) => unknown;

export type VisionCameraModule = typeof import('react-native-vision-camera');
export type BiometricsModule = typeof import('react-native-biometrics');
export type VideoModule = typeof import('react-native-video');
export type ClipboardModule = typeof import('@react-native-clipboard/clipboard');
export type MapsModule = typeof import('react-native-maps');

function loadVisionCamera(): VisionCameraModule | null {
  try {
    // Koşullu require şart: modül çözülemezse import zinciri tüm uygulamayı düşürürdü.
    return require('react-native-vision-camera') as VisionCameraModule;
  } catch {
    return null;
  }
}

function loadBiometrics(): BiometricsModule | null {
  try {
    return require('react-native-biometrics') as BiometricsModule;
  } catch {
    return null;
  }
}

function loadVideo(): VideoModule | null {
  try {
    return require('react-native-video') as VideoModule;
  } catch {
    return null;
  }
}

function loadClipboard(): ClipboardModule | null {
  try {
    return require('@react-native-clipboard/clipboard') as ClipboardModule;
  } catch {
    return null;
  }
}

/** QR/kod tarama — PayQr/TransferQr ekranları (null → placeholder + manuel giriş). */
export const visionCamera: VisionCameraModule | null = loadVisionCamera();

/** Biyometrik giriş — utils/biometrics.ts sarmalı kullanır (null → sensör yok kabul edilir). */
export const biometricsModule: BiometricsModule | null = loadBiometrics();

/** Video oynatıcı — VideoPlayerScreen (null → thumbnail placeholder kalır). */
export const videoModule: VideoModule | null = loadVideo();

/** Pano — MetropolHomeScreen kart no kopyalama (null → kopyala butonu gizlenir). */
export const clipboardModule: ClipboardModule | null = loadClipboard();

function loadMaps(): MapsModule | null {
  try {
    return require('react-native-maps') as MapsModule;
  } catch {
    return null;
  }
}

export const mapsModule: MapsModule | null = loadMaps();
