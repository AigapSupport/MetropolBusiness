/**
 * Profilim (PRD §11.2, prototip screens-profile.jsx): ad-soyad, e-posta, şehir,
 * TCKN (ayrı uçla, yanıt maskeli) — Güncelle. Avatar/kamera native modül [Faz sonrası].
 */
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { meApi } from '@/api/me';
import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useMe } from '@/hooks/useMe';
import { useTheme } from '@/theme/ThemeProvider';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileEdit'>;

export function ProfileEditScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const me = useMe();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [tckn, setTckn] = useState('');

  useEffect(() => {
    if (me.data !== undefined) {
      setFirstName(me.data.firstName ?? '');
      setLastName(me.data.lastName ?? '');
      setEmail(me.data.email ?? '');
      setCity(me.data.city ?? '');
    }
  }, [me.data]);

  const update = useMutation({
    mutationFn: async () => {
      await meApi.updateMe({ firstName, lastName, email, city });
      if (tckn.trim() !== '') {
        await meApi.updateTckn({ tckn: tckn.trim() });
      }
    },
    onSuccess: async () => {
      setTckn('');
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      navigation.goBack();
    },
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('account.profile.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <LabeledTextInput
          label={t('account.profile.firstName')}
          value={firstName}
          onChangeText={setFirstName}
        />
        <LabeledTextInput
          label={t('account.profile.lastName')}
          value={lastName}
          onChangeText={setLastName}
        />
        <LabeledTextInput
          label={t('account.profile.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <LabeledTextInput label={t('account.profile.city')} value={city} onChangeText={setCity} />
        <LabeledTextInput
          label={
            me.data?.tcknMasked != null
              ? `${t('account.profile.tckn')} (${me.data.tcknMasked})`
              : t('account.profile.tckn')
          }
          value={tckn}
          onChangeText={(text) => setTckn(text.replace(/\D/g, '').slice(0, 11))}
          placeholder={t('account.profile.tcknPlaceholder')}
          keyboardType="number-pad"
        />

        {update.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {t('home.sectionError')}
          </Text>
        ) : null}

        <PrimaryButton
          label={t('account.profile.save')}
          onPress={() => update.mutate()}
          disabled={firstName.trim() === '' || lastName.trim() === ''}
          loading={update.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex1: { flex: 1 } });
