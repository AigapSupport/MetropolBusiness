namespace MetropolBusiness.Application.Cards;

// Bakiye & işlem DTO'ları — docs/API_CONTRACT.md §6 alanlarıyla birebir.
// Para alanları bizim sözleşmede STRING'dir ("500.00", CLAUDE.md kural 3) —
// decimal değerler InvariantCulture "0.00" biçimiyle string'e çevrilir.

/// <summary>Cüzdan bakiyesi: { walletId, walletName, balance } (balance string "30824.00").</summary>
public sealed record WalletBalanceDto(int WalletId, string? WalletName, string Balance);

/// <summary>
/// GET /metropol/cards/{cardId}/balance yanıtı: { wallets, totalBalance, asOf, stale }.
/// KARAR 2026-06-11: asOf = son başarılı Metropol senkron zamanı; stale=true ise Metropol
/// erişilemedi ve değerler card_balances snapshot'ından (son bilinen) geldi. Alanlar
/// opsiyoneldir (varsayılanlı) — mevcut istemciler kırılmaz.
/// </summary>
public sealed record BalanceResponse(
    IReadOnlyList<WalletBalanceDto> Wallets,
    string TotalBalance,
    DateTimeOffset? AsOf = null,
    bool Stale = false);

/// <summary>
/// İşlem listesi öğesi (API_CONTRACT §6): type = "sale|transfer", amount işaretli string
/// ("-300.00"), maskedName backend'de maskelenir, date ISO-8601 (en iyi çaba parse).
/// </summary>
public sealed record TransactionItemDto(
    int TransactionId,
    string Type,
    string? WalletName,
    string? Title,
    string MaskedName,
    string ApprovalNo,
    string Amount,
    string Date);
