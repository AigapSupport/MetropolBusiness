/**
 * Kartvizitim (PRD §11.2): dijital kartvizit + vCard. QR üretimi react-native-svg
 * native modülü gerektirir — native build doğrulanana dek vCard metni gösterilir
 * ve kopyalanır (QR [~] notu TODO.md'de). Telefon/e-posta /me'den gelir.
 */
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useMe } from '@/hooks/useMe';
import { clipboardModule } from '@/utils/nativeModules';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessCard'>;

export function BusinessCardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const me = useMe();

  const fullName = [me.data?.firstName, me.data?.lastName].filter(Boolean).join(' ');
  const vCard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fullName}`,
    `ORG:${me.data?.tenant.name ?? ''}`,
    `TEL;TYPE=CELL:${me.data?.phone ?? ''}`,
    me.data?.email != null ? `EMAIL:${me.data.email}` : null,
    'END:VCARD',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  function copy(): void {
    clipboardModule?.default.setString(vCard);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('account.businessCard.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <View
          style={{
            backgroundColor: theme.colors.navy,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            gap: 4,
          }}
        >
          {/* Lacivert kart zemininde sabit beyaz metin (kontrast). */}
          <Text style={styles.cardName}>{fullName}</Text>
          <Text style={styles.cardLine}>{me.data?.tenant.name}</Text>
          <Text style={styles.cardLine}>{me.data?.phone}</Text>
          {me.data?.email != null ? <Text style={styles.cardLine}>{me.data.email}</Text> : null}
        </View>

        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
          }}
        >
          <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.xs, lineHeight: 18 }}>
            {vCard}
          </Text>
        </View>

        {clipboardModule !== null ? (
          <Pressable
            onPress={copy}
            accessibilityRole="button"
            style={{
              backgroundColor: theme.colors.brand,
              borderRadius: theme.radius.md,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={styles.copyText}>{t('account.businessCard.copy')}</Text>
          </Pressable>
        ) : null}

        {/* QR üretimi react-native-svg + qrcode-svg native build ile gelecek (TODO 2.5). */}
        <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.sm, textAlign: 'center' }}>
          {t('account.businessCard.qrSoon')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  cardName: { color: '#FFFFFF', fontWeight: '800', fontSize: 20 },
  cardLine: { color: '#FFFFFFCC', fontSize: 14 },
  copyText: { color: '#FFFFFF', fontWeight: '800' },
});
