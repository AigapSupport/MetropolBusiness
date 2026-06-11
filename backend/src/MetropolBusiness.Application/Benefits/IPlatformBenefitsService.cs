using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Benefits;

/// <summary>Platform admin kampanya/kategori yönetimi istek-yanıtları (API_CONTRACT §13).</summary>
public sealed record CategoryUpsertRequest(string Code, string Name, int SortOrder);

public sealed record AdminCategoryDto(
    Guid Id, string Code, string Name, int SortOrder, int CampaignCount);

public sealed record CampaignUpsertRequest(
    Guid CategoryId, string Title, string Body, string? BrandLogoUrl,
    string? DetailUrl, string Status, DateTimeOffset? PublishedAt = null);

public sealed record AdminCampaignDto(
    Guid Id, Guid CategoryId, string CategoryCode, string Title, string Body,
    string? BrandLogoUrl, string? DetailUrl, string Status, DateTimeOffset? PublishedAt);

/// <summary>
/// Platform admin kampanya + kategori CRUD'u (PANELS_SPEC B.6/B.7).
/// Tüm içerik GLOBAL yazılır (TenantId = null) — tüm firmalarda görünür.
/// </summary>
public interface IPlatformBenefitsService
{
    Task<IReadOnlyList<AdminCategoryDto>> GetCategoriesAsync(CancellationToken ct = default);
    Task<Result<AdminCategoryDto>> CreateCategoryAsync(CategoryUpsertRequest request, CancellationToken ct = default);
    Task<Result<AdminCategoryDto>> UpdateCategoryAsync(Guid id, CategoryUpsertRequest request, CancellationToken ct = default);
    Task<Result<bool>> DeleteCategoryAsync(Guid id, CancellationToken ct = default);

    Task<PagedResponse<AdminCampaignDto>> GetCampaignsAsync(
        string? categoryCode, int page, int pageSize, CancellationToken ct = default);
    Task<Result<AdminCampaignDto>> CreateCampaignAsync(CampaignUpsertRequest request, CancellationToken ct = default);
    Task<Result<AdminCampaignDto>> UpdateCampaignAsync(Guid id, CampaignUpsertRequest request, CancellationToken ct = default);
    Task<Result<bool>> DeleteCampaignAsync(Guid id, CancellationToken ct = default);
}
