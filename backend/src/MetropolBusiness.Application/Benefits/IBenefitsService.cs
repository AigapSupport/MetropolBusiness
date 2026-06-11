using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Benefits;

/// <summary>
/// Yan haklar okuma uçları (API_CONTRACT §4, PRD §7). İçerik kaynağı Announcement
/// deseniyle aynıdır: TenantId null = platform/global, dolu = yalnızca o firma;
/// query filter ikisini birden döndürür (ARCHITECTURE §3.4).
/// </summary>
public interface IBenefitsService
{
    Task<IReadOnlyList<BenefitCategoryDto>> GetCategoriesAsync(CancellationToken ct = default);

    Task<PagedResponse<CampaignListItemDto>> GetCampaignsAsync(
        string? categoryCode, int page, int pageSize, CancellationToken ct = default);

    Task<Result<CampaignDetailDto>> GetCampaignAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<BenefitItemDto>> GetCouponsAsync(CancellationToken ct = default);

    Task<IReadOnlyList<BenefitItemDto>> GetGiftCardsAsync(CancellationToken ct = default);
}
