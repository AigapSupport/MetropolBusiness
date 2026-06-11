/**
 * Navigasyon param listeleri — Faz 1'de ekran parametreleri (örn. kampanya id) eklendikçe genişler.
 */
import type { IsoDateString, MoneyString } from '@shared/common';
import type { SaleCodeType, TransferReceiverType, WalletId } from '@shared/metropol';

export type AuthStackParamList = {
  Splash: undefined;
  PhoneLogin: undefined;
  /** OTP ekranı — gönderim yanıtındaki referans ve sayaç süresiyle açılır. */
  Otp: { phone: string; otpRef: string; resendInSeconds: number };
  CompleteProfile: undefined;
};

/** Kök stack — tab'lar + hamburger menüden açılan Hesabım ekranları (PRD §11). */
export type RootStackParamList = {
  Main: undefined;
  AccountMenu: undefined;
  ProfileEdit: undefined;
  Preferences: undefined;
  BusinessCard: undefined;
  Language: undefined;
};

/** Alt tab bar — 5 sekme (PRD §4). Metropol ortadaki ana sekmedir. */
export type MainTabParamList = {
  Home: undefined;
  Benefits: undefined;
  Metropol: undefined;
  Chat: undefined;
  Other: undefined;
};

/** Yan Haklar stack'i (PRD §7) — grid + kampanya liste/detay + kupon + hediye çeki. */
export type BenefitsStackParamList = {
  BenefitsGrid: undefined;
  CampaignList: { categoryCode?: string; title: string };
  CampaignDetail: { id: string };
  /** Kupon ve hediye çeki aynı kart düzenini kullanır (PRD §7.3 — listeleme). */
  BenefitItems: { kind: 'coupons' | 'giftcards' };
};

/** Sohbet stack'i (PRD §9) — liste + konuşma + yeni sohbet. */
export type ChatStackParamList = {
  ChatList: undefined;
  Conversation: { id: string; title: string; isAssistant: boolean };
  NewChat: undefined;
};

/** Diğer sekmesi stack'i (PRD §10) — modül grid + İK ekranları. */
export type OtherStackParamList = {
  ModulesGrid: undefined;
  LeaveRequests: undefined;
  ExpenseRequests: undefined;
  Approvals: undefined;
};

/** Ana Sayfa stack'i (PRD §6) — feed + duyuru detayı + anket doldurma + video oynatma. */
export type HomeStackParamList = {
  HomeFeed: undefined;
  AnnouncementDetail: { id: string };
  SurveyFill: { id: string };
  VideoPlayer: { id: string };
};

/** Transfer formuna önceden çözülmüş alıcı (kayıtlı alıcı / QR) taşır. */
export interface TransferReceiverParam {
  type: TransferReceiverType;
  /** recipientId (saved) / opak token (qr) — API'ye receiver.value olarak gider. */
  value: string;
  maskedName?: string;
  maskedCardNo?: string;
}

/** Transfer onay ekranı parametreleri (PRD §8.7). */
export interface TransferConfirmParams {
  senderCardId: string;
  senderHolderName: string;
  senderMaskedCardNo: string;
  receiverType: TransferReceiverType;
  receiverValue: string;
  receiverDisplayName: string;
  receiverDisplayCardNo: string;
  walletId: WalletId;
  /** Tam TL (kuruşsuz) — MoneyString'e ekranda çevrilir. */
  amountWholeLira: string;
  note: string;
  /** Kayıtlı alıcıdan gelen transferde tekrar kaydetme seçeneği gösterilmez. */
  allowSaveRecipient: boolean;
}

/** Başarılı harcama fişi parametreleri (PRD §8.4 sonuç). */
export interface PayReceiptParams {
  merchantName: string;
  merchantNo: string;
  terminalNo: string;
  approvalNo: string;
  maskedCardNo: string;
  amount: MoneyString;
  date: IsoDateString;
  walletId: WalletId;
}

/** Başarılı transfer fişi parametreleri (PRD §8.7 sonuç). */
export interface TransferReceiptParams {
  senderName: string;
  receiverMaskedName: string;
  receiverMaskedCardNo: string;
  amount: MoneyString;
  date: IsoDateString;
  walletId: WalletId;
}

/**
 * Metropol sekme stack'i (PRD §8) — ana ekran + kart ekleme + harcama + transfer
 * + işlem geçmişi + keşfet. Harcama sırası KRİTİK: kod → kart seç → presale → onay.
 */
export type MetropolStackParamList = {
  MetropolHome: undefined;
  /** Kart detayı — 2 sekme: Bakiyeler / İşlemler (PRD §8.3). */
  CardDetail: { cardId: string };
  // Kart ekleme — 3 adım (PRD §8.2)
  AddCardNumber: undefined;
  AddCardOtp: { cardNo: string; phone: string; validationGuid: string };
  AddCardInfo: { phone: string; validationGuid: string; validationCode: string };
  // Harcama (PRD §8.4 — kart seçimi presale'den ÖNCE)
  PayChoose: undefined;
  PayQr: undefined;
  PayCode: undefined;
  PaySelectCard: { code: string; codeType: SaleCodeType };
  PayConfirm: { code: string; codeType: SaleCodeType; cardId: string };
  PaySuccess: { receipt: PayReceiptParams };
  // Transfer (PRD §8.7)
  TransferMenu: undefined;
  /** mode 'fixed': alıcı önceden çözülmüş (kayıtlı alıcı / QR / doğrulanmış kart) — receiver zorunlu. */
  TransferForm: { mode: 'self' | 'phone' | 'fixed'; receiver?: TransferReceiverParam };
  TransferQr: undefined;
  // "Başka Karta" alıcı doğrulama — 2 adım (AddAccount OTP akışı, API_CONTRACT §8)
  TransferCardRecipient: undefined;
  TransferCardOtp: { cardNo: string; phone: string; validationGuid: string };
  SavedRecipients: undefined;
  TransferConfirm: TransferConfirmParams;
  TransferSuccess: { receipt: TransferReceiptParams };
  // Diğer
  History: { cardId?: string };
  Explore: undefined;
};
