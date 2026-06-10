/**
 * Kart Ekle — Adım 3/3: kullanıcı bilgileri + onay (PRD §8.2,
 * screens-metropol-cards.jsx > CardAdd3). POST /metropol/cards/confirm —
 * OTP kodu (validationCode) bu istekte gider. Başarıda kart listesi invalidate
 * edilir (useConfirmCard) ve slider'a dönülür; hatada METROPOL_ERROR mesajı gösterilir.
 */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getMetropolErrorMessage, useConfirmCard } from '@/hooks/useMetropol';
import type { MetropolStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

import { FlowStepBar } from '../components/FlowStepBar';

type Props = NativeStackScreenProps<MetropolStackParamList, 'AddCardInfo'>;

const TCKN_LENGTH = 11;

export function AddCardInfoScreen({ navigation, route }: Props) {
  const { phone, validationGuid, validationCode } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const confirmCard = useConfirmCard();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [tckn, setTckn] = useState('');

  const valid = firstName.trim() !== '' && lastName.trim() !== '' && email.trim() !== '';

  const handleConfirm = () => {
    confirmCard.mutate(
      {
        validationGuid,
        validationCode: Number(validationCode),
        // memberId backend'de users.member_id'den çözülür; istemci değeri yok sayılır
        // (TODO.md 1.4 notu) — sözleşme alanı boş gönderilir.
        memberId: '',
        name: firstName.trim(),
        surname: lastName.trim(),
        email: email.trim(),
        phone,
        tckn: tckn.length === TCKN_LENGTH ? tckn : undefined,
      },
      {
        onSuccess: () => {
          // Başarı: kart listesi invalidate edildi → slider'a (ana ekran) dönülür.
          navigation.popToTop();
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
        <FlowStepBar step={3} total={3} />
        <View>
          <Text style={{ fontSize: theme.fontSize.xl, fontWeight: '800', color: theme.colors.ink }}>
            {t('metropol.addCard.step3Heading')}
          </Text>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.ink2,
              marginTop: theme.spacing.sm,
              lineHeight: 21,
            }}
          >
            {t('metropol.addCard.step3Subtitle')}
          </Text>
        </View>
        <View style={[styles.nameRow, { gap: theme.spacing.md }]}>
          <View style={styles.flex1}>
            <LabeledTextInput
              label={t('auth.firstNameLabel')}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.flex1}>
            <LabeledTextInput
              label={t('auth.lastNameLabel')}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        </View>
        <LabeledTextInput
          label={t('metropol.addCard.emailLabel')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <LabeledTextInput
          label={t('metropol.addCard.tcknLabel')}
          value={tckn}
          onChangeText={(text) => setTckn(text.replace(/\D/g, '').slice(0, TCKN_LENGTH))}
          keyboardType="number-pad"
          maxLength={TCKN_LENGTH}
        />
        {confirmCard.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {getMetropolErrorMessage(confirmCard.error, t('common.genericError'))}
          </Text>
        ) : null}
        <PrimaryButton
          label={t('metropol.addCard.confirm')}
          onPress={handleConfirm}
          disabled={!valid}
          loading={confirmCard.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  nameRow: { flexDirection: 'row' },
});
