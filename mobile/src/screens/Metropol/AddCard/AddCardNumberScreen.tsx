/**
 * Kart Ekle — Adım 1/3: kart numarası + telefon (PRD §8.2, screens-metropol-cards.jsx > CardAdd1).
 * POST /metropol/cards/add → validationGuid döner, SMS OTP gider → Adım 2'ye geçilir.
 * METROPOL_ERROR (422) mesajı kullanıcıya aynen gösterilir.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getMetropolErrorMessage, useAddCard } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { FlowStepBar } from '../components/FlowStepBar';

type Props = NativeStackScreenProps<MetropolStackParamList, 'AddCardNumber'>;

const CARD_NO_LENGTH = 16;
const PHONE_LENGTH = 10;

/** 16 haneyi 4'lü gruplar (yalnızca gösterim; API'ye boşluksuz gider). */
function groupCardNo(digits: string): string {
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function AddCardNumberScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const addCard = useAddCard();

  const [cardNo, setCardNo] = useState('');
  const [phone, setPhone] = useState('');

  const valid = cardNo.length === CARD_NO_LENGTH && phone.length === PHONE_LENGTH;

  const handleContinue = () => {
    addCard.mutate(
      { cardNo, mobilePhone: phone },
      {
        onSuccess: (response) => {
          navigation.navigate('AddCardOtp', {
            cardNo,
            phone,
            validationGuid: response.validationGuid,
          });
        },
      },
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('metropol.addCard.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <FlowStepBar step={1} total={3} />
        <View>
          <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.addCard.step1Heading')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              lineHeight: 21,
            }}
          >
            {t('metropol.addCard.step1Subtitle')}
          </Text>
        </View>
        <LabeledTextInput
          label={t('metropol.addCard.cardNoLabel')}
          value={groupCardNo(cardNo)}
          onChangeText={(text) => setCardNo(text.replace(/\D/g, '').slice(0, CARD_NO_LENGTH))}
          placeholder={t('metropol.addCard.cardNoPlaceholder')}
          keyboardType="number-pad"
          maxLength={CARD_NO_LENGTH + 3}
          autoFocus
        />
        <LabeledTextInput
          label={t('metropol.addCard.phoneLabel')}
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, PHONE_LENGTH))}
          placeholder={t('auth.phonePlaceholder')}
          prefix="+90"
          keyboardType="phone-pad"
          maxLength={PHONE_LENGTH}
        />
        {addCard.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {getMetropolErrorMessage(addCard.error, t('common.genericError'))}
          </Text>
        ) : null}
        <PrimaryButton
          label={t('common.continue')}
          onPress={handleContinue}
          disabled={!valid}
          loading={addCard.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
