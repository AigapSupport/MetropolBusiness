/**
 * Metropol sekme stack'i (PRD §8) — ana ekran + kart ekleme (3 adım) + harcama
 * (kod → KART SEÇ → presale/onay → sonuç; sıra kritik, CLAUDE.md §6) + transfer
 * + işlem geçmişi + keşfet (Faz 2.1 placeholder).
 */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddCardInfoScreen } from '@/screens/Metropol/AddCard/AddCardInfoScreen';
import { AddCardNumberScreen } from '@/screens/Metropol/AddCard/AddCardNumberScreen';
import { AddCardOtpScreen } from '@/screens/Metropol/AddCard/AddCardOtpScreen';
import { ExploreScreen } from '@/screens/Metropol/Explore/ExploreScreen';
import { HistoryScreen } from '@/screens/Metropol/History/HistoryScreen';
import { MetropolHomeScreen } from '@/screens/Metropol/MetropolHomeScreen';
import { PayChooseScreen } from '@/screens/Metropol/Spend/PayChooseScreen';
import { PayCodeScreen } from '@/screens/Metropol/Spend/PayCodeScreen';
import { PayConfirmScreen } from '@/screens/Metropol/Spend/PayConfirmScreen';
import { PayQrScreen } from '@/screens/Metropol/Spend/PayQrScreen';
import { PaySelectCardScreen } from '@/screens/Metropol/Spend/PaySelectCardScreen';
import { PaySuccessScreen } from '@/screens/Metropol/Spend/PaySuccessScreen';
import { SavedRecipientsScreen } from '@/screens/Metropol/Transfer/SavedRecipientsScreen';
import { TransferCardOtpScreen } from '@/screens/Metropol/Transfer/TransferCardOtpScreen';
import { TransferCardRecipientScreen } from '@/screens/Metropol/Transfer/TransferCardRecipientScreen';
import { TransferConfirmScreen } from '@/screens/Metropol/Transfer/TransferConfirmScreen';
import { TransferFormScreen } from '@/screens/Metropol/Transfer/TransferFormScreen';
import { TransferMenuScreen } from '@/screens/Metropol/Transfer/TransferMenuScreen';
import { TransferQrScreen } from '@/screens/Metropol/Transfer/TransferQrScreen';
import { TransferSuccessScreen } from '@/screens/Metropol/Transfer/TransferSuccessScreen';

import type { MetropolStackParamList } from './types';

const Stack = createNativeStackNavigator<MetropolStackParamList>();

export function MetropolStack() {
  return (
    <Stack.Navigator initialRouteName="MetropolHome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MetropolHome" component={MetropolHomeScreen} />
      {/* Kart ekleme — 3 adım (PRD §8.2) */}
      <Stack.Screen name="AddCardNumber" component={AddCardNumberScreen} />
      <Stack.Screen name="AddCardOtp" component={AddCardOtpScreen} />
      <Stack.Screen name="AddCardInfo" component={AddCardInfoScreen} />
      {/* Harcama (PRD §8.4) */}
      <Stack.Screen name="PayChoose" component={PayChooseScreen} />
      <Stack.Screen name="PayQr" component={PayQrScreen} />
      <Stack.Screen name="PayCode" component={PayCodeScreen} />
      <Stack.Screen name="PaySelectCard" component={PaySelectCardScreen} />
      <Stack.Screen name="PayConfirm" component={PayConfirmScreen} />
      <Stack.Screen name="PaySuccess" component={PaySuccessScreen} options={{ gestureEnabled: false }} />
      {/* Transfer (PRD §8.7) */}
      <Stack.Screen name="TransferMenu" component={TransferMenuScreen} />
      <Stack.Screen name="TransferForm" component={TransferFormScreen} />
      <Stack.Screen name="TransferQr" component={TransferQrScreen} />
      {/* "Başka Karta" alıcı doğrulama — 2 adım (AddAccount OTP akışı) */}
      <Stack.Screen name="TransferCardRecipient" component={TransferCardRecipientScreen} />
      <Stack.Screen name="TransferCardOtp" component={TransferCardOtpScreen} />
      <Stack.Screen name="SavedRecipients" component={SavedRecipientsScreen} />
      <Stack.Screen name="TransferConfirm" component={TransferConfirmScreen} />
      <Stack.Screen
        name="TransferSuccess"
        component={TransferSuccessScreen}
        options={{ gestureEnabled: false }}
      />
      {/* Diğer */}
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Explore" component={ExploreScreen} />
    </Stack.Navigator>
  );
}
