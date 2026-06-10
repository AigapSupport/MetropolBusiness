/**
 * Harcama Yap — yöntem seçimi (PRD §8.4 adım 1, screens-metropol-pay.jsx > PayChoose).
 * QR ile Ödeme / Kısa Kod ile Ödeme.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<MetropolStackParamList, 'PayChoose'>;

interface OptionProps {
  glyph: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function Option({ glyph, title, subtitle, onPress }: OptionProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.option,
        { backgroundColor: theme.colors.card, borderRadius: theme.radius.md, gap: theme.spacing.md },
      ]}
    >
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: theme.colors.brandSoft, borderRadius: theme.radius.md },
        ]}
      >
        <Text style={{ fontSize: theme.fontSize.xxl, color: theme.colors.brand }}>{glyph}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={{ fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.ink }}>
          {title}
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: theme.colors.ink2,
            marginTop: theme.spacing.xs / 2,
            lineHeight: 19,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Text style={{ fontSize: theme.fontSize.lg, color: theme.colors.ink3 }}>›</Text>
    </Pressable>
  );
}

export function PayChooseScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.pay.title')} onBack={() => navigation.goBack()} />
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.ink2 }}>
          {t('metropol.pay.chooseMethod')}
        </Text>
        <Option
          glyph="▣"
          title={t('metropol.pay.qrTitle')}
          subtitle={t('metropol.pay.qrSubtitle')}
          onPress={() => navigation.navigate('PayQr')}
        />
        <Option
          glyph="⌨"
          title={t('metropol.pay.codeTitle')}
          subtitle={t('metropol.pay.codeSubtitle')}
          onPress={() => navigation.navigate('PayCode')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  optionIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
});
