/** docs/API_CONTRACT.md §10 — CHAT REST uçları (mesajlaşmanın kendisi SignalR'da). */
import type { ItemList, Paged } from '@shared/common';
import type {
  Assistant,
  ChatMessage,
  ChatUser,
  ConversationListItem,
  CreateConversationRequest,
} from '@shared/chat';

import { api } from './client';

export const chatApi = {
  getConversations(): Promise<ItemList<ConversationListItem>> {
    return api.get<ItemList<ConversationListItem>>('/chat/conversations');
  },
  getMessages(conversationId: string, page = 1, pageSize = 30): Promise<Paged<ChatMessage>> {
    return api.getPaged<ChatMessage>(
      `/chat/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`,
    );
  },
  createConversation(request: CreateConversationRequest): Promise<ConversationListItem> {
    return api.post<ConversationListItem>('/chat/conversations', request);
  },
  getAssistants(): Promise<ItemList<Assistant>> {
    return api.get<ItemList<Assistant>>('/chat/assistants');
  },
  searchUsers(query: string): Promise<ItemList<ChatUser>> {
    return api.get<ItemList<ChatUser>>(`/chat/users?q=${encodeURIComponent(query)}`);
  },
};
