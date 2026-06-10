/**
 * Cüzdan sabitleri (CLAUDE.md §13): WalletId 1 = Resto (sunumda RESTORAN),
 * 3 = Gift (sunumda MARKET). Bakiye kartlarında TOPLAM ayrıca gösterilir.
 */
import type { WalletId } from '@shared/metropol';

import type { ThemeTokens } from '@/theme/tokens';

export const RESTAURANT_WALLET_ID: WalletId = 1;
export const MARKET_WALLET_ID: WalletId = 3;

/** Harcama/transfer ekranlarında seçilebilir cüzdanlar. */
export const SELECTABLE_WALLET_IDS: WalletId[] = [RESTAURANT_WALLET_ID, MARKET_WALLET_ID];

/** Cüzdan etiketi localization anahtarı (tr/en.json > metropol.wallets). */
export function walletLabelKey(walletId: WalletId): string {
  return walletId === MARKET_WALLET_ID
    ? 'metropol.wallets.market'
    : 'metropol.wallets.restaurant';
}

/** Cüzdan vurgu rengi — yalnızca tema token'larından (hardcode hex yok). */
export function walletAccent(walletId: WalletId, theme: ThemeTokens): string {
  return walletId === MARKET_WALLET_ID ? theme.colors.success : theme.colors.brand;
}
