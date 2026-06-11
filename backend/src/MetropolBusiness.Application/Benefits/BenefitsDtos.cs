namespace MetropolBusiness.Application.Benefits;

/// <summary>docs/API_CONTRACT.md §4 — BENEFITS (YAN HAKLAR) DTO'ları.</summary>
public sealed record BenefitCategoryDto(string Code, string Name);

public sealed record CampaignListItemDto(
    Guid Id, string Title, string? BrandLogoUrl, string CategoryCode);

public sealed record SimilarCampaignDto(Guid Id, string Title);

public sealed record CampaignDetailDto(
    Guid Id, string Title, string Body, string? BrandLogoUrl, string? DetailUrl,
    IReadOnlyList<SimilarCampaignDto> Similar);

/// <summary>Para string taşınır: "100.00" (CLAUDE.md kural 5).</summary>
public sealed record BenefitItemDto(
    Guid Id, string Title, string Brand, string Amount, DateTimeOffset? ExpiresAt);
