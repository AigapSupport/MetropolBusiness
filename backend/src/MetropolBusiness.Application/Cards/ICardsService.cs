using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Cards;

/// <summary>
/// Kart yönetimi use-case'leri (API_CONTRACT §5, TODO 1.4 backend).
/// Tüm uçlar Metropol proxy'sidir; istemci Metropol'e doğrudan gitmez.
/// Implementasyon Infrastructure'dadır (AppDbContext + IMetropolApiClient gerektirir).
/// </summary>
public interface ICardsService
{
    /// <summary>Kullanıcının aktif kartları (DB'den; maskeli no zaten maskeli saklanır).</summary>
    Task<Result<ItemsResponse<CardSummaryDto>>> ListAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// AddAccount proxy'si: kart no + telefon → ValidationGuid (SMS OTP gider).
    /// Bu adımda DB'ye kayıt YAZILMAZ; kart no LOG'LANMAZ (CLAUDE.md kural 4).
    /// </summary>
    Task<Result<AddCardResponse>> AddAsync(AddCardRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// AddAccountConfirm proxy'si: OTP doğrulanır, dönen UserAccountToken ŞİFRELİ saklanır
    /// ve Card kaydı oluşur. MemberId kullanıcının users.member_id değerinden alınır.
    /// </summary>
    Task<Result<ConfirmCardResponse>> ConfirmAsync(ConfirmCardRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// DeleteUser proxy'si: önce sahiplik (kendi kartı, tenant filtreli) doğrulanır,
    /// Metropol başarılı dönerse kart soft-delete edilir (DeletedAt).
    /// </summary>
    Task<Result<bool>> DeleteAsync(Guid cardId, CancellationToken cancellationToken = default);
}
