/**
 * Birebir / AI sohbet ekranı (PRD §9.1, prototip screens-chat.jsx): mesaj balonları,
 * "yazıyor…" (AI: AssistantTyping), gönder. Geçmiş REST'ten; canlı mesajlar hub'dan.
 * Çevrimdışıyken mesaj kuyruğa alınır (chatHub outbox) ve bağlanınca gönderilir.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ChatMessage } from '@shared/chat';
import { chatHub } from '@/api/chatHub';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useMessages } from '@/hooks/useChat';
import { useMe } from '@/hooks/useMe';
import type { ChatStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<ChatStackParamList, 'Conversation'>;

export function ConversationScreen({ navigation, route }: Props) {
  const { id, title, isAssistant } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const me = useMe();
  const userId = me.data?.id ?? null;
  const queryClient = useQueryClient();
  const history = useMessages(id);

  /** Canlı eklenen mesajlar — geçmiş sorgusunun üstüne bindirilir (id ile teklenir). */
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  /** Karşı tarafın okuduğu son mesajın zamanı — kendi balonlarımda "Okundu" işareti. */
  const [peerReadUpTo, setPeerReadUpTo] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      void chatHub.connect({
        onReceiveMessage: (conversationId, message) => {
          if (conversationId !== id) {
            return;
          }
          setAssistantTyping(false);
          setLiveMessages((current) =>
            current.some((m) => m.id === message.id) ? current : [...current, message],
          );
          void chatHub.markRead(conversationId, message.id);
          void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        },
        onAssistantTyping: (conversationId) => {
          if (conversationId === id) {
            setAssistantTyping(true);
          }
        },
        // Birebir "yazıyor…": karşı taraftan Typing geldiğinde 3 sn görünür (PRD §9.1).
        onTyping: (conversationId) => {
          if (conversationId !== id) {
            return;
          }
          setPeerTyping(true);
          if (typingTimer.current !== null) {
            clearTimeout(typingTimer.current);
          }
          typingTimer.current = setTimeout(() => setPeerTyping(false), 3000);
        },
        // Okundu bilgisi: karşı taraf MarkRead yapınca kendi mesajlarım işaretlenir.
        onRead: (conversationId, _userId, messageId) => {
          if (conversationId !== id) {
            return;
          }
          setPeerReadUpTo(messageId);
        },
        onError: () => setAssistantTyping(false),
        onConnectionChange: (connected) => setOffline(!connected),
      });
      void chatHub.joinConversation(id);
    }, [id, queryClient]),
  );

  // Geçmiş yüklenince son mesajı okundu işaretle (PRD §9.1 okundu bilgisi).
  useEffect(() => {
    const items = history.data?.items;
    if (items !== undefined && items.length > 0) {
      void chatHub.markRead(id, items[items.length - 1].id);
    }
  }, [history.data, id]);

  const merged: ChatMessage[] = [
    ...(history.data?.items ?? []),
    ...liveMessages.filter((live) => !(history.data?.items ?? []).some((m) => m.id === live.id)),
  ];

  function send(): void {
    const content = draft.trim();
    if (content === '') {
      return;
    }
    setDraft('');
    void chatHub.sendMessage(id, content).then((state) => {
      if (state === 'queued') {
        setOffline(true);
      }
    });
  }

  // Karşı tarafın okuduğu son mesajın zamanı: o ana kadarki kendi mesajlarım "okundu".
  const peerReadAt =
    peerReadUpTo === null ? null : (merged.find((m) => m.id === peerReadUpTo)?.createdAt ?? null);

  function renderBubble({ item }: { item: ChatMessage }) {
    const mine = item.senderId !== null && item.senderId === userId;
    const readByPeer =
      mine && peerReadAt !== null && new Date(item.createdAt) <= new Date(peerReadAt);
    return (
      <View
        style={[
          styles.bubble,
          {
            alignSelf: mine ? 'flex-end' : 'flex-start',
            backgroundColor: mine ? theme.colors.brand : theme.colors.card,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
        <Text style={{ color: mine ? '#FFFFFF' : theme.colors.ink, fontSize: theme.fontSize.md }}>
          {item.content}
        </Text>
        <Text
          style={{
            color: mine ? '#FFFFFFAA' : theme.colors.ink3,
            fontSize: theme.fontSize.xs,
            marginTop: 4,
            alignSelf: 'flex-end',
          }}
        >
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {readByPeer ? ` · ${t('chat.read')}` : ''}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flex1, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader
        title={isAssistant ? `${title} · ${t('chat.aiBadge')}` : title}
        onBack={() => navigation.goBack()}
      />

      {offline ? (
        <View style={{ backgroundColor: theme.colors.navySoft, padding: theme.spacing.sm }}>
          <Text
            style={{ color: theme.colors.ink2, fontSize: theme.fontSize.xs, textAlign: 'center' }}
          >
            {t('chat.offlineQueue')}
          </Text>
        </View>
      ) : null}

      {history.isPending ? (
        <ActivityIndicator color={theme.colors.brand} style={{ marginTop: theme.spacing.xl }} />
      ) : (
        <FlatList
          ref={listRef}
          data={merged}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={renderBubble}
          ListEmptyComponent={
            <Text style={{ color: theme.colors.ink2, textAlign: 'center' }}>
              {t('chat.startConversation')}
            </Text>
          }
        />
      )}

      {assistantTyping || peerTyping ? (
        <Text
          style={{
            color: theme.colors.ink2,
            fontSize: theme.fontSize.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xs,
            fontStyle: 'italic',
          }}
        >
          {t('chat.assistantTyping')}
        </Text>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.inputRow,
            { padding: theme.spacing.md, gap: theme.spacing.sm, backgroundColor: theme.colors.card },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              chatHub.sendTyping(id);
            }}
            placeholder={t('chat.inputPlaceholder')}
            placeholderTextColor={theme.colors.ink3}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.bg,
                borderRadius: theme.radius.md,
                color: theme.colors.ink,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={draft.trim() === ''}
            accessibilityRole="button"
            style={{
              backgroundColor: theme.colors.brand,
              borderRadius: 999,
              paddingHorizontal: theme.spacing.md,
              justifyContent: 'center',
              opacity: draft.trim() === '' ? 0.5 : 1,
            }}
          >
            <Text style={styles.sendText}>{t('chat.send')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 10 },
  // Marka zemini üzerinde sabit beyaz (kontrast).
  sendText: { color: '#FFFFFF', fontWeight: '800' },
});
