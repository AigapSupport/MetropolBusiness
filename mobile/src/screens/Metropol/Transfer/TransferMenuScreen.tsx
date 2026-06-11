/**
 * Bakiye Transferi — ana menü (PRD §8.7, screens-metropol-transfer.jsx > TransferMenu).
 * GÖNDEREN: Kartlarım Arası / Başka Karta (alıcı kart verify-card/confirm-card OTP
 * akışıyla doğrulanır — API_CONTRACT §8) / Cep Numarasına.
 * ALICI: Kayıtlı Alıcı / QR Kod Alıcı. GEÇMİŞ: İşlem Geçmişi.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MetropolStackParamList, 'TransferMenu'>;

interface MenuRowProps {
  glyph: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
  disabledBadge?: string;
  last?: boolean;
}

function MenuRow({ glyph, title, subtitle, onPress, disabled = false, disabledBadge, last = false }: MenuRowProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.menuRow,
        {
          gap: theme.spacing.md,
          borderBottomColor: theme.colors.line2,
          borderBottomWidth: last ? 0 : 1,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: theme.colors.brandSoft, borderRadius: theme.radius.sm },
        ]}
      >
        <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.brand }}>{glyph}</Text>
      </View>
      <View style={styles.flex1}>
        <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
          <Text style={{ fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.ink }}>
            {title}
          </Text>
          {disabledBadge !== undefined ? (
            <View
              style={{
                backgroundColor: theme.colors.navySoft,
                borderRadius: 999,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: theme.fontSize.xs, fontWeight: '700', color: theme.colors.navy }}>
                {disabledBadge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.ink2,
            marginTop: theme.spacing.xs / 2,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.ink3 }}>›</Text>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        fontSize: theme.fontSize.sm,
        fontWeight: '700',
        color: theme.colors.ink2,
        letterSpacing: 0.2,
        marginBottom: theme.spacing.sm + 2,
        marginLeft: theme.spacing.xs,
      }}
    >
      {label}
    </Text>
  );
}

export function TransferMenuScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const panel = { backgroundColor: theme.colors.card, borderRadius: theme.radius.md };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.transfer.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <SectionLabel label={t('metropol.transfer.senderSection')} />
        <View style={panel}>
          <MenuRow
            glyph="⇄"
            title={t('metropol.transfer.betweenMyCards')}
            subtitle={t('metropol.transfer.betweenMyCardsSub')}
            onPress={() => navigation.navigate('TransferForm', { mode: 'self' })}
          />
          {/* Başka Karta: alıcı kart 2 adımlı verify-card/confirm-card OTP akışıyla doğrulanır. */}
          <MenuRow
            glyph="▤"
            title={t('metropol.transfer.toOtherCard')}
            subtitle={t('metropol.transfer.toOtherCardSub')}
            onPress={() => navigation.navigate('TransferCardRecipient')}
          />
          <MenuRow
            glyph="✆"
            title={t('metropol.transfer.toPhone')}
            subtitle={t('metropol.transfer.toPhoneSub')}
            onPress={() => navigation.navigate('TransferForm', { mode: 'phone' })}
            last
          />
        </View>

        <View style={{ height: theme.spacing.lg }} />
        <SectionLabel label={t('metropol.transfer.receiverSection')} />
        <View style={panel}>
          <MenuRow
            glyph="◉"
            title={t('metropol.transfer.savedRecipient')}
            subtitle={t('metropol.transfer.savedRecipientSub')}
            onPress={() => navigation.navigate('SavedRecipients')}
          />
          <MenuRow
            glyph="▣"
            title={t('metropol.transfer.qrRecipient')}
            subtitle={t('metropol.transfer.qrRecipientSub')}
            onPress={() => navigation.navigate('TransferQr')}
            last
          />
        </View>

        <View style={{ height: theme.spacing.lg }} />
        <SectionLabel label={t('metropol.transfer.historySection')} />
        <View style={panel}>
          <MenuRow
            glyph="↺"
            title={t('metropol.actions.history')}
            subtitle={t('metropol.transfer.historySub')}
            onPress={() => navigation.navigate('History', {})}
            last
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  menuIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
});
