/**
 * Metropol hook'ları (React Query) — docs/API_CONTRACT.md §5–8.
 *
 * Idempotency kuralı (CLAUDE.md §6/§8): sale/confirm ve transfer POST'larında
 * Idempotency-Key ZORUNLU. Anahtar mutation BAŞLAMADAN üretilir (ilk mutate'te),
 * BAŞARIYA KADAR saklanır; başarısız denemenin "Tekrar Dene"si AYNI anahtarla
 * gider (backend kayıtlı yanıtı aynen döner → çift harcama/transfer engellenir).
 * Yeni bir akış (yeni ekran/hook örneği) yeni anahtar üretir.
 */
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { ErrorCodes } from '@shared/common';
import type {
  AddCardRequest,
  ConfirmCardRequest,
  ConfirmRecipientCardRequest,
  PresaleInfoRequest,
  SaleConfirmRequest,
  TransferRequest,
  ResolveQrRequest,
  VerifyRecipientCardRequest,
} from '@shared/metropol';

import { ApiError } from '@/api/client';
import { metropolApi } from '@/api/metropol';
import type { TransactionQuery } from '@/api/metropol';
import { createUuid } from '@/utils/uuid';

/** Query anahtarları — invalidation prefix eşleşmesiyle çalışır. */
export const metropolKeys = {
  all: ['metropol'] as const,
  cards: ['metropol', 'cards'] as const,
  balance: (cardId: string) => ['metropol', 'balance', cardId] as const,
  balances: ['metropol', 'balance'] as const,
  recent: (cardId: string) => ['metropol', 'recent', cardId] as const,
  recents: ['metropol', 'recent'] as const,
  transactions: (cardId: string, range: { startDate?: string; endDate?: string }) =>
    ['metropol', 'transactions', cardId, range] as const,
  allTransactions: ['metropol', 'transactions'] as const,
  savedRecipients: ['metropol', 'savedRecipients'] as const,
};

// ── §5 Kart ───────────────────────────────────────────────

export function useCards() {
  return useQuery({ queryKey: metropolKeys.cards, queryFn: metropolApi.getCards });
}

/** POST /metropol/cards/add — validationGuid döner; OTP adımına geçilir. */
export function useAddCard() {
  return useMutation({ mutationFn: (request: AddCardRequest) => metropolApi.addCard(request) });
}

/** POST /metropol/cards/confirm — başarıda kart listesi invalidate (slider güncellenir). */
export function useConfirmCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ConfirmCardRequest) => metropolApi.confirmCard(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: metropolKeys.cards });
    },
  });
}

/** DELETE /metropol/cards/{id} — onay diyaloğu ekranda; başarıda liste invalidate. */
export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => metropolApi.deleteCard(cardId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: metropolKeys.cards });
    },
  });
}

// ── §6 Bakiye & işlem ─────────────────────────────────────

export function useBalance(cardId: string | null) {
  return useQuery({
    queryKey: metropolKeys.balance(cardId ?? ''),
    queryFn: () => {
      if (cardId === null) {
        throw new Error('cardId yokken bakiye sorgulanamaz');
      }
      return metropolApi.getBalance(cardId);
    },
    enabled: cardId !== null,
  });
}

/**
 * Manuel yenileme (yenile ikonu): refresh=true backend cache'ini atlar (PRD §17.7),
 * dönen değer query cache'ine yazılır — ekran anında güncellenir.
 */
export function useRefreshBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => metropolApi.getBalance(cardId, true),
    onSuccess: (data, cardId) => {
      queryClient.setQueryData(metropolKeys.balance(cardId), data);
    },
  });
}

export function useRecentTransactions(cardId: string | null) {
  return useQuery({
    queryKey: metropolKeys.recent(cardId ?? ''),
    queryFn: () => {
      if (cardId === null) {
        throw new Error('cardId yokken işlemler sorgulanamaz');
      }
      return metropolApi.getRecentTransactions(cardId);
    },
    enabled: cardId !== null,
  });
}

const TRANSACTIONS_PAGE_SIZE = 20;

/** Sayfalı işlem geçmişi (infinite) + tarih aralığı filtresi. */
export function useTransactionsInfinite(
  cardId: string | null,
  range: { startDate?: string; endDate?: string },
) {
  return useInfiniteQuery({
    queryKey: metropolKeys.transactions(cardId ?? '', range),
    queryFn: ({ pageParam }) => {
      if (cardId === null) {
        throw new Error('cardId yokken işlem geçmişi sorgulanamaz');
      }
      const query: TransactionQuery = {
        page: pageParam,
        pageSize: TRANSACTIONS_PAGE_SIZE,
        ...range,
      };
      return metropolApi.getTransactions(cardId, query);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    enabled: cardId !== null,
  });
}

// ── İdempotent mutation altyapısı ─────────────────────────

interface IdempotentMutationOptions<TRequest, TResponse> {
  mutationFn: (request: TRequest, idempotencyKey: string) => Promise<TResponse>;
  onSuccess?: (data: TResponse, request: TRequest) => void;
}

/**
 * Idempotency-Key yaşam döngüsü: ilk mutate'te üretilir, başarısız denemelerde
 * KORUNUR (Tekrar Dene aynı anahtarla gider), yalnızca BAŞARIDA temizlenir.
 */
function useIdempotentMutation<TRequest, TResponse>({
  mutationFn,
  onSuccess,
}: IdempotentMutationOptions<TRequest, TResponse>) {
  const keyRef = useRef<string | null>(null);
  return useMutation({
    mutationFn: (request: TRequest) => {
      if (keyRef.current === null) {
        keyRef.current = createUuid();
      }
      return mutationFn(request, keyRef.current);
    },
    onSuccess: (data, request) => {
      keyRef.current = null;
      onSuccess?.(data, request);
    },
  });
}

// ── §7 Harcama ────────────────────────────────────────────

/**
 * POST /metropol/sale/presale-info — kart seçiminden SONRA çağrılır (sıra kritik).
 * Sunucu tarafında oturum/saleRefCode ürettiğinden query değil mutation'dır
 * (yeniden render'da kendiliğinden tekrarlanmamalı).
 */
export function usePresaleInfo() {
  return useMutation({
    mutationFn: (request: PresaleInfoRequest) => metropolApi.getPresaleInfo(request),
  });
}

/** POST /metropol/sale/confirm — idempotent; başarıda bakiye/işlem listeleri bayatlar. */
export function useSaleConfirm() {
  const queryClient = useQueryClient();
  return useIdempotentMutation({
    mutationFn: (request: SaleConfirmRequest, idempotencyKey: string) =>
      metropolApi.confirmSale(request, idempotencyKey),
    onSuccess: (_data, request) => {
      void queryClient.invalidateQueries({ queryKey: metropolKeys.balance(request.cardId) });
      void queryClient.invalidateQueries({ queryKey: metropolKeys.recent(request.cardId) });
      void queryClient.invalidateQueries({ queryKey: metropolKeys.allTransactions });
    },
  });
}

// ── §8 Transfer ───────────────────────────────────────────

/** POST /metropol/transfer — idempotent; başarıda bakiye + işlem + kayıtlı alıcı bayatlar. */
export function useTransfer() {
  const queryClient = useQueryClient();
  return useIdempotentMutation({
    mutationFn: (request: TransferRequest, idempotencyKey: string) =>
      metropolApi.transfer(request, idempotencyKey),
    onSuccess: (_data, request) => {
      // Kartlar arası transferde alıcı kart bakiyesi de değişir — tüm bakiyeler bayatlar.
      void queryClient.invalidateQueries({ queryKey: metropolKeys.balances });
      void queryClient.invalidateQueries({ queryKey: metropolKeys.recents });
      void queryClient.invalidateQueries({ queryKey: metropolKeys.allTransactions });
      if (request.saveRecipient === true) {
        void queryClient.invalidateQueries({ queryKey: metropolKeys.savedRecipients });
      }
    },
  });
}

export function useResolveTransferQr() {
  return useMutation({
    mutationFn: (request: ResolveQrRequest) => metropolApi.resolveTransferQr(request),
  });
}

/**
 * POST /metropol/transfer/verify-card — "Başka Karta" 1/2 (AddAccount). OTP SMS'i
 * ALICININ karta kayıtlı telefonuna gider; tekrar gönder de bu hook'la yapılır ve
 * aynı rate-limit'e tabidir (429 RATE_LIMITED — mesaj getMetropolErrorMessage ile).
 */
export function useVerifyRecipientCard() {
  return useMutation({
    mutationFn: (request: VerifyRecipientCardRequest) => metropolApi.verifyRecipientCard(request),
  });
}

/**
 * POST /metropol/transfer/confirm-card — "Başka Karta" 2/2 (AddAccountConfirm).
 * Alıcının kartı kaydedilmez; dönen opak receiverToken transferde receiver.type='card'
 * value'su olur. Cache'e dokunmaz (kart listesi/bakiye değişmez).
 */
export function useConfirmRecipientCard() {
  return useMutation({
    mutationFn: (request: ConfirmRecipientCardRequest) =>
      metropolApi.confirmRecipientCard(request),
  });
}

export function useSavedRecipients() {
  return useQuery({
    queryKey: metropolKeys.savedRecipients,
    queryFn: metropolApi.getSavedRecipients,
  });
}

export function useDeleteSavedRecipient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipientId: string) => metropolApi.deleteSavedRecipient(recipientId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: metropolKeys.savedRecipients });
    },
  });
}

// ── Hata gösterimi ────────────────────────────────────────

/**
 * METROPOL_ERROR (422) mesajları backend'de Türkçe'ye çevrilmiştir ve kullanıcıya
 * aynen gösterilir (API_CONTRACT §0.2/§0.5); diğer hatalarda genel mesaj anahtarı
 * döner — ekran t() ile çevirir.
 */
export function getMetropolErrorMessage(error: unknown, genericMessage: string): string {
  if (error instanceof ApiError && error.error.code === ErrorCodes.MetropolError) {
    return error.error.message;
  }
  if (error instanceof ApiError && error.error.message.length > 0) {
    return error.error.message;
  }
  return genericMessage;
}
