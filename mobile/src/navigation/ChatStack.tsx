/** Sohbet stack'i (PRD §9): liste → konuşma / yeni sohbet. */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatListScreen } from '@/screens/Chat/ChatListScreen';
import { ConversationScreen } from '@/screens/Chat/ConversationScreen';
import { NewChatScreen } from '@/screens/Chat/NewChatScreen';

import type { ChatStackParamList } from './types';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
    </Stack.Navigator>
  );
}
