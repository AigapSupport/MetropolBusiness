/** docs/API_CONTRACT.md §10 — CHAT (REST + SignalR olay adları). */

import type { IsoDateString } from './common';

export type ConversationType = 'direct' | 'assistant';
export type SenderType = 'user' | 'assistant';

export interface ConversationListItem {
  id: string;
  type: ConversationType;
  title: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastAt: IsoDateString;
  unreadCount: number;
  isAssistant: boolean;
}

export interface ChatMessage {
  id: string;
  senderType: SenderType;
  senderId: string | null;
  content: string;
  createdAt: IsoDateString;
  readByMe: boolean;
}

export type CreateConversationRequest =
  | { type: 'direct'; participantUserId: string }
  | { type: 'assistant'; assistantId: string };

export interface Assistant {
  id: string;
  name: string;
  persona: string;
  avatarUrl: string | null;
}

export interface CreateAssistantRequest {
  name: string;
  persona: string;
  avatarUrl?: string;
}

export interface ChatUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** SignalR hub yolu ve olay adları (§10) — istemci/sunucu sözleşmesi. */
export const ChatHub = {
  path: '/hubs/chat',
  client: {
    receiveMessage: 'ReceiveMessage',
    typing: 'Typing',
    read: 'Read',
    assistantTyping: 'AssistantTyping',
  },
  server: {
    joinConversation: 'JoinConversation',
    sendMessage: 'SendMessage',
    typing: 'Typing',
    markRead: 'MarkRead',
  },
} as const;
