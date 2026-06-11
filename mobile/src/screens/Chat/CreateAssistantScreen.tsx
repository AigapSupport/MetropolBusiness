/**
 * AI asistan oluşturma (PRD §9.1, prototip screens-chat.jsx): isim + kişilik (persona)
 * + avatar URL. PRD §17.2 kararı: asistanı FİRMA ADMİN tanımlar — bu ekrana giriş
 * yalnızca company_admin rolünde görünür (backend POST /chat/assistants policy'si
 * zaten CompanyAdmin; istemci görünürlüğü tek başına güvenlik değildir).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { LabeledTextInput } from '@/components/LabeledTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTheme } from '@/theme/ThemeProvider';

import type { Assistant, CreateAssistantRequest } from '@shared/chat';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ChatStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'CreateAssistant'>;

export function CreateAssistantScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [persona, setPersona] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const create = useMutation({
    mutationFn: (request: CreateAssistantRequest) =>
      api.post<Assistant>('/chat/assistants', request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat', 'assistants'] });
      navigation.goBack();
    },
  });

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('chat.createAssistant.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm, lineHeight: 20 }}>
          {t('chat.createAssistant.hint')}
        </Text>

        <LabeledTextInput
          label={t('chat.createAssistant.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('chat.createAssistant.namePlaceholder')}
        />
        <LabeledTextInput
          label={t('chat.createAssistant.persona')}
          value={persona}
          onChangeText={setPersona}
          placeholder={t('chat.createAssistant.personaPlaceholder')}
        />
        <LabeledTextInput
          label={t('chat.createAssistant.avatar')}
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://… (opsiyonel)"
        />

        {create.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {t('home.sectionError')}
          </Text>
        ) : null}

        <PrimaryButton
          label={t('chat.createAssistant.submit')}
          onPress={() =>
            create.mutate({
              name: name.trim(),
              persona: persona.trim(),
              avatarUrl: avatarUrl.trim() === '' ? undefined : avatarUrl.trim(),
            })
          }
          disabled={name.trim() === '' || persona.trim() === ''}
          loading={create.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex1: { flex: 1 } });
