/**
 * Sohbet listesi (PRD §9.1, prototip screens-chat.jsx): kişi/AI asistan satırları —
 * avatar/monogram, isim, son mesaj, saat, okunmamış rozeti; AI asistanlar rozetle ayrılır.
 */
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { chatHub } from '@/api/chatHub';
import { useConversations } from '@/hooks/useChat';
import type { ChatStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const conversations = useConversations();
  const queryClient = useQueryClient();

  // Liste odaktayken gelen her mesaj listeyi tazeler (son mesaj + unread).
  useFocusEffect(
    useCallback(() => {
      void chatHub.connect({
        onReceiveMessage: () => {
          void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        },
        onAssistantTyping: () => undefined,
      });
    }, [queryClient]),
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
        <View>
          <Text style={{ fontSize: theme.fontSize.sm, color: theme.colors.ink2, fontWeight: '600' }}>
            {t('chat.subtitle')}
          </Text>
          <Text style={{ fontSize: theme.fontSize.xxl, fontWeight: '800', color: theme.colors.ink }}>
            {t('tabs.chat')}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('NewChat')}
          accessibilityRole="button"
          style={{
            backgroundColor: theme.colors.brand,
            borderRadius: 999,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          }}
        >
          <Text style={styles.newChatText}>{t('chat.new')}</Text>
        </Pressable>
      </View>

      {conversations.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : conversations.isError ? (
        <View style={styles.statusBox}>
          <Text style={{ color: theme.colors.ink2 }}>{t('home.sectionError')}</Text>
          <Pressable onPress={() => void conversations.refetch()} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: theme.colors.brand, fontWeight: '700' }}>{t('home.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations.data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>{t('chat.empty')}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('Conversation', {
                  id: item.id,
                  title: item.title,
                  isAssistant: item.isAssistant,
                })
              }
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
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: item.isAssistant
                      ? `${theme.colors.navy}18`
                      : `${theme.colors.brand}20`,
                  },
                ]}
              >
                <Text
                  style={{
                    color: item.isAssistant ? theme.colors.navy : theme.colors.brand,
                    fontWeight: '800',
                    fontSize: 16,
                  }}
                >
                  {item.title.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={{ color: theme.colors.ink, fontWeight: '700' }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.isAssistant ? (
                    <View
                      style={{
                        backgroundColor: `${theme.colors.navy}18`,
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{ color: theme.colors.navy, fontSize: theme.fontSize.xs, fontWeight: '800' }}
                      >
                        {t('chat.aiBadge')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={{ color: theme.colors.ink2, fontSize: theme.fontSize.sm }}
                  numberOfLines={1}
                >
                  {item.lastMessage === '' ? t('chat.noMessages') : item.lastMessage}
                </Text>
              </View>
              <View style={styles.meta}>
                {item.lastAt !== null ? (
                  <Text style={{ color: theme.colors.ink3, fontSize: theme.fontSize.xs }}>
                    {formatTime(item.lastAt)}
                  </Text>
                ) : null}
                {item.unreadCount > 0 ? (
                  <View style={[styles.unread, { backgroundColor: theme.colors.brand }]}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  // Marka zemini üzerinde sabit beyaz (kontrast).
  newChatText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  statusBox: { alignItems: 'center', gap: 8, marginTop: 32 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { alignItems: 'flex-end', gap: 6 },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
