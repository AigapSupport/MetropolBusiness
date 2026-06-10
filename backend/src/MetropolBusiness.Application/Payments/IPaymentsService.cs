using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Payments;

/// <summary>
/// Harcama use-case'leri (API_CONTRACT §7, TODO 1.6 backend). Akış sırası KRİTİKTİR
/// (CLAUDE.md §6): kod okunur → kart seçilir → presale → onay → confirm.
/// SaleConfirm parasal uçtur: Idempotency-Key ile çift harcama engellenir (ARCHITECTURE §5.3).
/// </summary>
public interface IPaymentsService
{
    /// <summary>
    /// GetPreSaleInfo proxy'si: kart sahipliği (tenant + kullanıcı) doğrulanır,
    /// MemberId oturum sahibinin users.member_id değerinden, UserAccountRef karttan çözülür.
    /// </summary>
    Task<Result<PresaleInfoResponse>> PresaleAsync(
        PresaleInfoRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// SaleConfirm proxy'si + idempotency (ARCHITECTURE §5.3): aynı anahtarla başarılı
    /// işlem TEKRAR Metropol'e gitmez (kayıtlı yanıt döner); süren işlem 409 DUPLICATE_OPERATION.
    /// Başarıda kartın bakiye cache'i geçersiz kılınır (balanceAfter ayrı uçtan alınır).
    /// </summary>
    Task<Result<SaleConfirmResponse>> ConfirmSaleAsync(
        SaleConfirmRequest request, string idempotencyKey, CancellationToken cancellationToken = default);

    /// <summary>GetSaleInfo proxy'si: satış durumu sorgusu (kart no maskeli döner).</summary>
    Task<Result<SaleInfoResponse>> GetSaleInfoAsync(
        string? merchantCode, string? terminalCode, string? saleRefCode,
        CancellationToken cancellationToken = default);
}
