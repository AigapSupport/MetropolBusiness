using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Cards;

/// <summary>
/// Bakiye & işlem use-case'leri (API_CONTRACT §6, TODO 1.5 backend).
/// Bakiye/işlem verisi DB'de SAKLANMAZ — Metropol'den canlı çekilir; bakiye için
/// ~30 sn kısa cache + manuel yenileme uygulanır (PRD §17.7).
/// </summary>
public interface IBalanceService
{
    /// <summary>
    /// BalanceQuery proxy'si: kartın cüzdan bakiyeleri + toplam. walletId verilirse
    /// yalnızca o cüzdan döner; forceRefresh=true cache'i atlar (kart üstündeki yenile ikonu).
    /// </summary>
    Task<Result<BalanceResponse>> GetBalanceAsync(
        Guid cardId, int? walletId, bool forceRefresh, CancellationToken cancellationToken = default);

    /// <summary>
    /// TransactionHistory proxy'si: sayfalı işlem listesi; tarih aralığı filtresi opsiyonel.
    /// Maskeleme backend'de (Masking.MaskName); tutarlar işaretli string.
    /// </summary>
    Task<Result<PagedResponse<TransactionItemDto>>> GetTransactionsAsync(
        Guid cardId, int page, int pageSize, DateTimeOffset? startDate, DateTimeOffset? endDate,
        CancellationToken cancellationToken = default);

    /// <summary>Son 5 işlem (ana ekran kısayolu, API_CONTRACT §6 /recent).</summary>
    Task<Result<ItemsResponse<TransactionItemDto>>> GetRecentAsync(
        Guid cardId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Kullanıcının TÜM kartlarının işlemleri birleşik (KARAR 2026-06-12: geçmiş
    /// ekranındaki "Tümü" seçeneği). Kart bazlı listeler birleştirilip tarihe göre
    /// sıralanır; tek kartın hatası/bozuk kaydı listeyi düşürmez (o kart atlanır).
    /// </summary>
    Task<Result<PagedResponse<TransactionItemDto>>> GetAllTransactionsAsync(
        int page, int pageSize, DateTimeOffset? startDate, DateTimeOffset? endDate,
        CancellationToken cancellationToken = default);
}
