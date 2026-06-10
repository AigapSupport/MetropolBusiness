/**
 * Kart Seçimi (PRD §8.4 adım 3 — presale'den ÖNCE; SIRA KRİTİK, CLAUDE.md §6).
 * "Ödeme yapılacak kartı seçiniz" → kart seç → Devam → PayConfirm (presale orada çağrılır).
 * Prototip: screens-metropol-pay.jsx > PaySelectCard.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCards } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { CardPickRow } from '../components/CardPickRow';

type Props = NativeStackScreenProps<MetropolStackParamList, 'PaySelectCard'>;

export function PaySelectCardScreen({ navigation, route }: Props) {
  const { code, codeType } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardsQuery = useCards();

  const cards = cardsQuery.data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ?? cards[0]?.id ?? null;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.pay.selectCardTitle')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <View>
          <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.pay.selectCardHeading')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              lineHeight: 21,
            }}
          >
            {t('metropol.pay.selectCardSubtitle')}
          </Text>
        </View>
        {cardsQuery.isPending ? (
          <ActivityIndicator color={theme.colors.brand} />
        ) : cards.length === 0 ? (
          <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.sm }}>
            {t('metropol.emptySubtitle')}
          </Text>
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            {cards.map((card, index) => (
              <CardPickRow
                key={card.id}
                holderName={card.holderName}
                maskedCardNo={card.maskedCardNo}
                index={index}
                selected={selected === card.id}
                onPress={() => setSelectedId(card.id)}
              />
            ))}
          </View>
        )}
        <PrimaryButton
          label={t('common.continue')}
          onPress={() => {
            if (selected !== null) {
              navigation.navigate('PayConfirm', { code, codeType, cardId: selected });
            }
          }}
          disabled={selected === null}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
