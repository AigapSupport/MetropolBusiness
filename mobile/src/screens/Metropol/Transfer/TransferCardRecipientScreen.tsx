/**
 * Başka Karta — Adım 1/2: alıcı kart no + karta kayıtlı telefon (PRD §8.7,
 * screens-metropol-transfer.jsx > TransferBetween mode 'other'; doğrulama akışı
 * AddCardNumberScreen ile aynı AddAccount deseni — API_CONTRACT §8 verify-card).
 * POST /metropol/transfer/verify-card → validationGuid döner; OTP SMS'i ALICININ
 * telefonuna gider (aile içi senaryoda alıcı kodu gönderene söyler) → Adım 2'ye geçilir.
 * Alıcının kartı bizim cards tablosuna YAZILMAZ. 429 RATE_LIMITED / 422 METROPOL_ERROR
 * mesajları getMetropolErrorMessage ile aynen gösterilir.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getMetropolErrorMessage, useVerifyRecipientCard } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { FlowStepBar } from '../components/FlowStepBar';

type Props = NativeStackScreenProps<MetropolStackParamList, 'TransferCardRecipient'>;

const CARD_NO_LENGTH = 16;
// Telefon 10-11 hane: 5XXXXXXXXX veya başında 0 ile 05XXXXXXXXX kabul edilir.
const PHONE_MIN_LENGTH = 10;
const PHONE_MAX_LENGTH = 11;

/** 16 haneyi 4'lü gruplar (yalnızca gösterim; API'ye boşluksuz gider). */
function groupCardNo(digits: string): string {
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function TransferCardRecipientScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const verifyCard = useVerifyRecipientCard();

  const [cardNo, setCardNo] = useState('');
  const [phone, setPhone] = useState('');

  const valid =
    cardNo.length === CARD_NO_LENGTH &&
    phone.length >= PHONE_MIN_LENGTH &&
    phone.length <= PHONE_MAX_LENGTH;

  const handleContinue = () => {
    verifyCard.mutate(
      { cardNo, mobilePhone: phone },
      {
        onSuccess: (response) => {
          navigation.navigate('TransferCardOtp', {
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
      <ScreenHeader title={t('metropol.transfer.toOtherCard')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <FlowStepBar step={1} total={2} />
        <View>
          <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.transfer.otherCardHeading')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              lineHeight: 21,
            }}
          >
            {t('metropol.transfer.otherCardSubtitle')}
          </Text>
        </View>
        <LabeledTextInput
          label={t('metropol.transfer.receiverCardNo')}
          value={groupCardNo(cardNo)}
          onChangeText={(text) => setCardNo(text.replace(/\D/g, '').slice(0, CARD_NO_LENGTH))}
          placeholder={t('metropol.addCard.cardNoPlaceholder')}
          keyboardType="number-pad"
          maxLength={CARD_NO_LENGTH + 3}
          autoFocus
        />
        <LabeledTextInput
          label={t('metropol.transfer.receiverCardPhone')}
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH))}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          maxLength={PHONE_MAX_LENGTH}
        />
        {verifyCard.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {getMetropolErrorMessage(verifyCard.error, t('common.genericError'))}
          </Text>
        ) : null}
        <PrimaryButton
          label={t('common.continue')}
          onPress={handleContinue}
          disabled={!valid}
          loading={verifyCard.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
