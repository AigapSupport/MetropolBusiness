/** Diğer sekmesi stack'i (PRD §10): modül grid → izin / masraf / onay ekranları. */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ApprovalsScreen } from '@/screens/Other/ApprovalsScreen';
import { ExpenseRequestsScreen } from '@/screens/Other/ExpenseRequestsScreen';
import { LeaveRequestsScreen } from '@/screens/Other/LeaveRequestsScreen';
import { OtherScreen } from '@/screens/Other/OtherScreen';

import type { OtherStackParamList } from './types';

const Stack = createNativeStackNavigator<OtherStackParamList>();

export function OtherStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ModulesGrid" component={OtherScreen} />
      <Stack.Screen name="LeaveRequests" component={LeaveRequestsScreen} />
      <Stack.Screen name="ExpenseRequests" component={ExpenseRequestsScreen} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} />
    </Stack.Navigator>
  );
}
