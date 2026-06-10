namespace MetropolBusiness.Application.Payments;

// Harcama DTO'ları — docs/API_CONTRACT.md §7 alanlarıyla birebir.
// Para alanları bizim sözleşmede STRING'dir ("200.00", CLAUDE.md kural 5).
// PII kuralı: kart no istemciye YALNIZCA maskeli gider; UserAccountToken hiç dönmez/log'lanmaz.

/// <summary>
/// POST /metropol/sale/presale-info isteği (Metropol GetPreSaleInfo proxy'si).
/// codeType: 1=QR, 2=QuickCode (CLAUDE.md §6). MemberId ve UserAccountRef İSTEKTEN ALINMAZ —
/// backend cardId'den token'ı, oturum sahibinden users.member_id'yi çözer.
/// </summary>
public sealed record PresaleInfoRequest(
    string Code,
    int CodeType,
    Guid CardId);

/// <summary>
/// POST /metropol/sale/presale-info yanıtı (API_CONTRACT §7): tutar/mağaza/ürün bilgisi.
/// suggestedWalletId, ProductId'ye göre backend'de belirlenir (CLAUDE.md §6 WalletId kuralı).
/// kdv/discountRatio/sessionExpireDate Metropol'den geldiği biçimde geçirilir (biçim belgesiz).
/// </summary>
public sealed record PresaleInfoResponse(
    int TransactionId,
    string SaleRefCode,
    string MerchantNo,
    string TerminalNo,
    string MerchantName,
    string? CityName,
    string? DistrictName,
    string RequestAmount,
    int ProductId,
    string? ProductName,
    int SuggestedWalletId,
    string? Kdv,
    string? DiscountRatio,
    string? SessionExpireDate);

/// <summary>
/// POST /metropol/sale/confirm isteği (Metropol SaleConfirm proxy'si, Idempotency-Key zorunlu).
/// consumerRefCode boşsa backend üretir ("auto-or-client-uuid", API_CONTRACT §7).
/// </summary>
public sealed record SaleConfirmRequest(
    int TransactionId,
    string SaleRefCode,
    Guid CardId,
    int WalletId,
    string Amount,
    string? ConsumerRefCode);

/// <summary>
/// POST /metropol/sale/confirm yanıtı — başarı fişi (API_CONTRACT §7).
/// balanceAfter alanı SÖZLEŞMEDEN KALDIRILDI: Metropol SaleConfirm yanıtında bakiye yoktur;
/// backend bakiye cache'ini geçersiz kılar, güncel bakiye ayrı uçtan alınır (§6 balance).
/// merchantName Metropol confirm yanıtında dönmez — istemci presale ekranından taşır (null olabilir).
/// </summary>
public sealed record SaleConfirmResponse(
    bool Success,
    string MerchantNo,
    string TerminalNo,
    string ApprovalNo,
    string MaskedCardNo,
    string Amount,
    string? MerchantName,
    string Date);

/// <summary>
/// GET /metropol/sale/info yanıtı (Metropol GetSaleInfo proxy'si): işlem durumu (0/1/2/4).
/// CardNo backend'de maskelenir — maskesiz kart no istemciye gitmez (CLAUDE.md kural 4).
/// </summary>
public sealed record SaleInfoResponse(
    string? MerchantCode,
    string? TerminalCode,
    string? TransactionId,
    int TransactionStatus,
    string TransactionAmount,
    string? SaleRefCode,
    string MaskedCardNo,
    string CardBalance);
