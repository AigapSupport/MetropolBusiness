/**
 * Yeni sohbet (PRD §9.1): firma içi kullanıcı arama + AI asistan listesi.
 * Seçim, konuşma oluşturur/mevcutsa onu döndürür ve sohbete geçer.
 */
import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ConversationListItem } from '@shared/chat';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAssistants, useChatUserSearch, useCreateConversation } from '@/hooks/useChat';
import { useMe } from '@/hooks/useMe';
import type { ChatStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<ChatStackParamList, 'NewChat'>;

export function NewChatScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const users = useChatUserSearch(query);
  const assistants = useAssistants();
  const create = useCreateConversation();
  const me = useMe();
  // Asistanı firma admin tanımlar (PRD §17.2) — giriş yalnız ona görünür;
  // asıl yetki backend policy'sindedir (CompanyAdmin).
  const canCreateAssistant = me.data?.role === 'company_admin';

  function openConversation(conversation: ConversationListItem): void {
    navigation.replace('Conversation', {
      id: conversation.id,
      title: conversation.title,
      isAssistant: conversation.isAssistant,
    });
  }

  function startDirect(userId: string): void {
    create.mutate(
      { type: 'direct', participantUserId: userId },
      { onSuccess: openConversation },
    );
  }

  function startAssistant(assistantId: string): void {
    create.mutate(
      { type: 'assistant', assistantId },
      { onSuccess: openConversation },
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title={t('chat.newTitle')} onBack={() => navigation.goBack()} />

      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('chat.searchPlaceholder')}
          placeholderTextColor={theme.colors.ink3}
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 12,
            color: theme.colors.ink,
          }}
        />

        {create.isError ? (
          <Text style={{ color: theme.colors.danger, fontSize: theme.fontSize.sm }}>
            {t('home.sectionError')}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={query.trim() === '' ? [] : (users.data?.items ?? [])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.ink2, fontWeight: '700', fontSize: theme.fontSize.sm }}>
              {t('chat.assistantsHeader')}
            </Text>
            {canCreateAssistant ? (
              <Pressable
                onPress={() => navigation.navigate('CreateAssistant')}
                accessibilityRole="button"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.brand,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.colors.brand, fontWeight: '800' }}>
                  {t('chat.createAssistant.entry')}
                </Text>
              </Pressable>
            ) : null}
            {assistants.isPending ? (
              <ActivityIndicator color={theme.colors.brand} />
            ) : (
              (assistants.data?.items ?? []).map((assistant) => (
                <Pressable
                  key={assistant.id}
                  onPress={() => startAssistant(assistant.id)}
                  disabled={create.isPending}
                  accessibilityRole="button"
                  style={[
                    styles.row,
                    {
                      backgroundColor: theme.colors.card,
                      borderRadius: theme.radius.md,
                      padding: theme.spacing.md,
                      gap: theme.spacing.md,
                    },
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: `${theme.colors.navy}18` }]}>
                    <Text style={{ color: theme.colors.navy, fontWeight: '800' }}>
                      {assistant.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.ink, fontWeight: '700', flex: 1 }}>
                    {assistant.name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: `${theme.colors.navy}18`,
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: theme.colors.navy, fontSize: theme.fontSize.xs, fontWeight: '800' }}>
                      {t('chat.aiBadge')}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
            <Text
              style={{
                color: theme.colors.ink2,
                fontWeight: '700',
                fontSize: theme.fontSize.sm,
                marginTop: theme.spacing.md,
              }}
            >
              {t('chat.peopleHeader')}
            </Text>
            {query.trim() === '' ? (
              <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.sm }}>
                {t('chat.searchHint')}
              </Text>
            ) : users.isPending ? (
              <ActivityIndicator color={theme.colors.brand} />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => startDirect(item.id)}
            disabled={create.isPending}
            accessibilityRole="button"
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.card,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
                gap: theme.spacing.md,
              },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: `${theme.colors.brand}20` }]}>
              <Text style={{ color: theme.colors.brand, fontWeight: '800' }}>
                {item.name.charAt(0)}
              </Text>
            </View>
            <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{item.name}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
