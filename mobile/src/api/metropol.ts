/**
 * docs/API_CONTRACT.md §5–8 — METROPOL proxy uçları (kart, bakiye/işlem, harcama, transfer).
 * Tipler @shared/metropol'dan; istemci Metropol'e doğrudan gitmez (CLAUDE.md §2.3).
 * Para hareketi uçlarında (sale/confirm, transfer) Idempotency-Key başlığı ZORUNLUDUR;
 * anahtar üretimi/saklama kuralı hooks/useMetropol.ts içindedir.
 */
import type { ItemList, Paged } from '@shared/common';
import type {
  AddCardRequest,
  AddCardResponse,
  BalanceResponse,
  CardSummary,
  ConfirmCardRequest,
  ConfirmCardResponse,
  ConfirmRecipientCardRequest,
  ConfirmRecipientCardResponse,
  PresaleInfoRequest,
  PresaleInfoResponse,
  ReceiveQrResponse,
  ResolveQrRequest,
  ResolveQrResponse,
  SaleConfirmRequest,
  SaleConfirmResponse,
  SavedRecipient,
  TransactionItem,
  TransferRequest,
  TransferResponse,
  VerifyRecipientCardRequest,
  VerifyRecipientCardResponse,
} from '@shared/metropol';

import { api } from './client';

/** GET /metropol/cards/{id}/transactions sorgu parametreleri (§6). */
export interface TransactionQuery {
  page?: number;
  pageSize?: number;
  /** ISO-8601 UTC (§0.5). */
  startDate?: string;
  endDate?: string;
}

function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const parts = Object.entries(params)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}

export const metropolApi = {
  // ── §5 Kart ─────────────────────────────────────────────
  /** Kullanıcının kartları. */
  getCards(): Promise<ItemList<CardSummary>> {
    return api.get<ItemList<CardSummary>>('/metropol/cards');
  },
  /** (AddAccount) Kart no + telefon → validationGuid döner, SMS OTP gider. */
  addCard(request: AddCardRequest): Promise<AddCardResponse> {
    return api.post<AddCardResponse>('/metropol/cards/add', request);
  },
  /** (AddAccountConfirm) OTP + kullanıcı bilgileri → kart bağlanır (201). */
  confirmCard(request: ConfirmCardRequest): Promise<ConfirmCardResponse> {
    return api.post<ConfirmCardResponse>('/metropol/cards/confirm', request);
  },
  /** (DeleteUser) Onay diyaloğu sonrası kart bağı kaldırılır → 204. */
  deleteCard(cardId: string): Promise<void> {
    return api.delete<void>(`/metropol/cards/${cardId}`);
  },

  // ── §6 Bakiye & işlem ───────────────────────────────────
  /** (BalanceQuery) refresh=true backend ~30 sn cache'ini atlar (manuel yenileme). */
  getBalance(cardId: string, refresh = false): Promise<BalanceResponse> {
    return api.get<BalanceResponse>(
      `/metropol/cards/${cardId}/balance${refresh ? '?refresh=true' : ''}`,
    );
  },
  /** (TransactionHistory) Sayfalı işlem geçmişi + opsiyonel tarih aralığı. */
  getTransactions(cardId: string, query: TransactionQuery = {}): Promise<Paged<TransactionItem>> {
    return api.get<Paged<TransactionItem>>(
      `/metropol/cards/${cardId}/transactions${toQueryString({ ...query })}`,
    );
  },
  /** Son 5 işlem (ana ekran kısayolu). */
  getRecentTransactions(cardId: string): Promise<ItemList<TransactionItem>> {
    return api.get<ItemList<TransactionItem>>(`/metropol/cards/${cardId}/recent`);
  },

  // ── §7 Harcama (sıra: kod → KART SEÇ → presale → onay → confirm) ──
  /** (GetPreSaleInfo) Kart seçiminden SONRA çağrılır (CLAUDE.md §6). */
  getPresaleInfo(request: PresaleInfoRequest): Promise<PresaleInfoResponse> {
    return api.post<PresaleInfoResponse>('/metropol/sale/presale-info', request);
  },
  /**
   * (SaleConfirm) Idempotency-Key ZORUNLU; aynı denemenin tekrarında AYNI anahtar
   * gönderilir — backend kayıtlı yanıtı aynen döner (çift harcama engeli).
   */
  confirmSale(request: SaleConfirmRequest, idempotencyKey: string): Promise<SaleConfirmResponse> {
    return api.post<SaleConfirmResponse>('/metropol/sale/confirm', request, {
      'Idempotency-Key': idempotencyKey,
    });
  },

  // ── §8 Transfer ─────────────────────────────────────────
  /** (BalanceTransfer) Idempotency-Key ZORUNLU — confirmSale ile aynı tekrar kuralı. */
  transfer(request: TransferRequest, idempotencyKey: string): Promise<TransferResponse> {
    return api.post<TransferResponse>('/metropol/transfer', request, {
      'Idempotency-Key': idempotencyKey,
    });
  },
  /** Kendi kartım için para-al QR yükü (akışın alıcı yarısı, API_CONTRACT §8). */
  getReceiveQr(cardId: string): Promise<ReceiveQrResponse> {
    return api.get<ReceiveQrResponse>(`/metropol/transfer/receive-qr?cardId=${cardId}`);
  },
  /** QR yükünden alıcı çözümleme (maskeli ad/no + opak token). */
  resolveTransferQr(request: ResolveQrRequest): Promise<ResolveQrResponse> {
    return api.post<ResolveQrResponse>('/metropol/transfer/resolve-qr', request);
  },
  /**
   * (AddAccount) "Başka Karta" alıcı doğrulama 1/2: OTP SMS'i alıcının karta kayıtlı
   * telefonuna gider — 429 RATE_LIMITED dönebilir (kullanıcı başına 5/saat).
   */
  verifyRecipientCard(request: VerifyRecipientCardRequest): Promise<VerifyRecipientCardResponse> {
    return api.post<VerifyRecipientCardResponse>('/metropol/transfer/verify-card', request);
  },
  /**
   * (AddAccountConfirm) "Başka Karta" alıcı doğrulama 2/2: alıcının kartı KAYDEDİLMEZ;
   * maskeli alıcı + opak receiverToken döner (transferde receiver.type='card' value'su).
   */
  confirmRecipientCard(
    request: ConfirmRecipientCardRequest,
  ): Promise<ConfirmRecipientCardResponse> {
    return api.post<ConfirmRecipientCardResponse>('/metropol/transfer/confirm-card', request);
  },
  /** Kayıtlı alıcılar — ekleme transfer isteğindeki saveRecipient bayrağıyla yapılır. */
  getSavedRecipients(): Promise<ItemList<SavedRecipient>> {
    return api.get<ItemList<SavedRecipient>>('/metropol/saved-recipients');
  },
  deleteSavedRecipient(recipientId: string): Promise<void> {
    return api.delete<void>(`/metropol/saved-recipients/${recipientId}`);
  },
};
