/** Sohbet React Query hook'ları (PRD §9) — canlı akış chatHub'dan, geçmiş REST'ten. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatApi } from '@/api/chat';
import type { CreateConversationRequest } from '@shared/chat';

export function useConversations() {
  return useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => chatApi.getConversations(),
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => chatApi.getMessages(conversationId, 1, 50),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateConversationRequest) => chatApi.createConversation(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
  });
}

export function useAssistants() {
  return useQuery({
    queryKey: ['chat', 'assistants'],
    queryFn: () => chatApi.getAssistants(),
  });
}

export function useChatUserSearch(query: string) {
  return useQuery({
    queryKey: ['chat', 'users', query],
    queryFn: () => chatApi.searchUsers(query),
    enabled: query.trim().length > 0,
  });
}
