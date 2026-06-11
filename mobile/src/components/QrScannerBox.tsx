/**
 * QR tarama kutusu — PayQr ve TransferQr ekranlarının ortak kamera alanı.
 * react-native-vision-camera yüklüyse gerçek tarama yapılır (qr + code-128);
 * modül yoksa (eski native build) ya da kamera izni reddedilirse ekrandaki
 * manuel giriş fallback'i çalışmaya devam etsin diye placeholder çerçevesi
 * gösterilir — mevcut akış hiçbir durumda bozulmaz.
 */
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { visionCamera } from '@/utils/nativeModules';
import type { VisionCameraModule } from '@/utils/nativeModules';

interface QrScannerBoxProps {
  /** Okunan ilk kod değeriyle çağrılır (ekran odaklıyken bir kez; odağa dönünce yeniden). */
  onScanned: (value: string) => void;
}

type PermissionState = 'pending' | 'granted' | 'denied';

/** Kamera yokken/izin reddedilince gösterilen çerçeve (önceki placeholder tasarımı). */
function PlaceholderFrame({ message }: { message: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.frame,
        styles.placeholderFrame,
        { backgroundColor: theme.colors.navy, borderRadius: theme.radius.lg },
      ]}
    >
      <View style={[styles.scanBox, { borderColor: theme.colors.card }]} />
      <Text
        style={{
          color: theme.colors.card,
          fontSize: theme.fontSize.md,
          fontWeight: '600',
          textAlign: 'center',
          marginTop: theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

interface CameraScannerProps extends QrScannerBoxProps {
  /** Null-check edilmiş vision-camera modülü (hook'lar buradan çağrılır). */
  camera: VisionCameraModule;
}

function CameraScanner({ camera, onScanned }: CameraScannerProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const [permission, setPermission] = useState<PermissionState>('pending');
  // Aynı kodun her karede tekrar tetiklenmesini engeller; odağa dönünce sıfırlanır.
  const scannedRef = useRef(false);

  useEffect(() => {
    if (isFocused) {
      scannedRef.current = false;
    }
  }, [isFocused]);

  // İzin akışı: verilmişse direkt taramaya geç, değilse sistem diyaloğuyla iste.
  useEffect(() => {
    let cancelled = false;
    if (camera.Camera.getCameraPermissionStatus() === 'granted') {
      setPermission('granted');
      return;
    }
    camera.Camera.requestCameraPermission()
      .then((result) => {
        if (!cancelled) {
          setPermission(result === 'granted' ? 'granted' : 'denied');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPermission('denied');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [camera]);

  const device = camera.useCameraDevice('back');
  const codeScanner = camera.useCodeScanner({
    codeTypes: ['qr', 'code-128'],
    onCodeScanned: (codes) => {
      if (scannedRef.current) {
        return;
      }
      const value = codes.find((code) => code.value !== undefined && code.value !== '')?.value;
      if (value !== undefined) {
        scannedRef.current = true;
        onScanned(value);
      }
    },
  });

  if (permission === 'denied') {
    // İzin reddedildi — manuel giriş fallback'i ekranda görünür kalır.
    return <PlaceholderFrame message={t('metropol.pay.qrPermissionDenied')} />;
  }
  if (permission === 'pending' || device === undefined) {
    return <PlaceholderFrame message={t('metropol.pay.qrStarting')} />;
  }
  return (
    <View
      style={[styles.frame, { backgroundColor: theme.colors.navy, borderRadius: theme.radius.lg }]}
    >
      <camera.Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        codeScanner={codeScanner}
      />
      {/* tarama hedef çerçevesi — kamera görüntüsünün üstünde */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.scanBox, { borderColor: theme.colors.card }]} />
      </View>
    </View>
  );
}

export function QrScannerBox({ onScanned }: QrScannerBoxProps) {
  const { t } = useTranslation();
  if (visionCamera === null) {
    // Modül yüklenemedi (örn. eski native build) — önceki placeholder davranışı.
    return <PlaceholderFrame message={t('metropol.pay.qrPlaceholder')} />;
  }
  return <CameraScanner camera={visionCamera} onScanned={onScanned} />;
}

const styles = StyleSheet.create({
  frame: { height: 280, overflow: 'hidden' },
  placeholderFrame: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBox: { width: 180, height: 180, borderWidth: 3, borderRadius: 20, opacity: 0.5 },
});
