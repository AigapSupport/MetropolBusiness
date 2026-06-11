/** docs/API_CONTRACT.md §5–9 — METROPOL proxy uçları (kart, bakiye, harcama, transfer, merchant). */

import type { IsoDateString, MoneyString } from './common';

// ── §5 Kart ─────────────────────────────────────────────

export interface CardSummary {
  id: string;
  maskedCardNo: string;
  holderName: string;
  status: 'active' | 'passive';
}

export interface AddCardRequest {
  cardNo: string;
  mobilePhone: string;
}

export interface AddCardResponse {
  validationGuid: string;
}

export interface ConfirmCardRequest {
  validationGuid: string;
  validationCode: number;
  memberId: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  tckn?: string;
}

export interface ConfirmCardResponse {
  cardId: string;
  maskedCardNo: string;
  name: string;
  surName: string;
}

// ── §6 Bakiye & işlem ───────────────────────────────────

/** WalletId 1 = Resto, 3 = Gift (CLAUDE.md §13). */
export type WalletId = number;

export interface WalletBalance {
  walletId: WalletId;
  walletName: string;
  balance: MoneyString;
}

export interface BalanceResponse {
  wallets: WalletBalance[];
  totalBalance: MoneyString;
  /**
   * Son başarılı Metropol senkron zamanı (KARAR 2026-06-11: bakiye snapshot'ı
   * card_balances'ta tutulur). Opsiyonel — eski istemciler kırılmaz.
   */
  asOf?: IsoDateString | null;
  /** true = Metropol erişilemedi; değerler son bilinen snapshot'tan (asOf anına ait). */
  stale?: boolean;
}

export interface TransactionItem {
  transactionId: number;
  type: 'sale' | 'transfer';
  walletName: string;
  title: string;
  maskedName: string;
  approvalNo: string;
  /** İşaretli tutar: "-300.00" gider, "300.00" gelir. */
  amount: MoneyString;
  date: IsoDateString;
}

// ── §7 Harcama (sıra: QR/kod → kart seç → presale → onay → confirm) ──

/** 1 = QRCode, 2 = QuickCode (CLAUDE.md §6). */
export type SaleCodeType = 1 | 2;

export interface PresaleInfoRequest {
  code: string;
  codeType: SaleCodeType;
  cardId: string;
}

export interface PresaleInfoResponse {
  transactionId: number;
  saleRefCode: string;
  merchantNo: string;
  terminalNo: string;
  merchantName: string;
  cityName: string;
  districtName: string;
  requestAmount: MoneyString;
  productId: number;
  productName: string;
  suggestedWalletId: WalletId;
  kdv: string;
  discountRatio: string;
  sessionExpireDate: IsoDateString;
}

export interface SaleConfirmRequest {
  transactionId: number;
  saleRefCode: string;
  cardId: string;
  walletId: WalletId;
  amount: MoneyString;
  consumerRefCode: string;
}

export interface SaleConfirmResponse {
  success: boolean;
  merchantNo: string;
  terminalNo: string;
  approvalNo: string;
  maskedCardNo: string;
  amount: MoneyString;
  /** Metropol confirm yanıtında ad dönmeyebilir (sözleşme notu, API_CONTRACT §7). */
  merchantName: string | null;
  date: IsoDateString;
  // balanceAfter kaldırıldı: bakiye, confirm sonrası GET .../balance ucundan alınır
  // (backend cache'i geçersiz kılar) — bkz. API_CONTRACT §7 notu.
}

// ── §8 Transfer ─────────────────────────────────────────

export type TransferReceiverType = 'card' | 'qr' | 'phone' | 'saved';

export interface TransferRequest {
  senderCardId: string;
  receiver: {
    type: TransferReceiverType;
    value: string;
  };
  walletId: WalletId;
  amount: MoneyString;
  note?: string;
  saveRecipient?: boolean;
  recipientLabel?: string;
}

export interface TransferResponse {
  success: boolean;
  senderName: string;
  receiverMaskedName: string;
  receiverMaskedCardNo: string;
  amount: MoneyString;
  date: IsoDateString;
}

export interface ResolveQrRequest {
  qrPayload: string;
}

export interface ResolveQrResponse {
  receiverMaskedName: string;
  receiverMaskedCardNo: string;
  receiverToken: string;
}

/**
 * "Başka Karta" alıcı doğrulama 1/2 (AddAccount proxy'si, API_CONTRACT §8):
 * OTP SMS'i alıcının KARTA KAYITLI telefonuna gider. 429 RATE_LIMITED (5/saat).
 */
export interface VerifyRecipientCardRequest {
  cardNo: string;
  mobilePhone: string;
}

export interface VerifyRecipientCardResponse {
  validationGuid: string;
}

/** "Başka Karta" alıcı doğrulama 2/2 (AddAccountConfirm) — alıcının kartı KAYDEDİLMEZ. */
export interface ConfirmRecipientCardRequest {
  validationGuid: string;
  validationCode: number;
}

/** receiverToken OPAK'tır: transferde receiver { type: 'card', value: receiverToken } olur. */
export interface ConfirmRecipientCardResponse {
  receiverMaskedName: string;
  receiverMaskedCardNo: string;
  receiverToken: string;
}

export interface SavedRecipient {
  id: string;
  label: string;
  maskedCardNo: string;
}

// ── §9 Merchant (Keşfet) ────────────────────────────────

export interface Merchant {
  merchantCode: string;
  signboardName: string;
  sector: string;
  subSector: string;
  city: string;
  district: string;
  saleAddress: string;
  telNo: string;
  lat: string;
  lng: string;
  activeFlag: number;
  campaignCode: number;
}

export interface MerchantListResponse {
  listType: number;
  lastListVersionDate: IsoDateString;
  items: Merchant[];
}

export interface MerchantFeedbackRequest {
  message: string;
}
