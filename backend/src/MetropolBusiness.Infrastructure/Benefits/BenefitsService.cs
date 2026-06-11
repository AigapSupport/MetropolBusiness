using MetropolBusiness.Application.Benefits;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Benefits;

/// <summary>
/// Yan haklar okuma uçları (API_CONTRACT §4). Query filter global (TenantId null)
/// + firma içeriğini birlikte döndürür; yalnızca yayında ve yayım zamanı gelmiş
/// içerik listelenir. Sıralama/sayfalama bellekte (SQLite test kısıtı — Content deseni;
/// içerik kümesi küçük, Faz 3 performans turunda gözden geçirilir).
/// </summary>
public sealed class BenefitsService(AppDbContext dbContext, TimeProvider timeProvider)
    : IBenefitsService
{
    public async Task<IReadOnlyList<BenefitCategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var categories = await dbContext.CampaignCategories.AsNoTracking().ToListAsync(ct);
        return categories
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new BenefitCategoryDto(c.Code, c.Name))
            .ToList();
    }

    public async Task<PagedResponse<CampaignListItemDto>> GetCampaignsAsync(
        string? categoryCode, int page, int pageSize, CancellationToken ct = default)
    {
        var now = timeProvider.GetUtcNow();
        var query = dbContext.Campaigns.AsNoTracking()
            .Include(c => c.Category)
            .Where(c => c.Status == ContentStatus.Published);

        if (!string.IsNullOrWhiteSpace(categoryCode))
        {
            query = query.Where(c => c.Category!.Code == categoryCode);
        }

        var campaigns = (await query.ToListAsync(ct))
            .Where(c => c.PublishedAt == null || c.PublishedAt <= now)
            .OrderByDescending(c => c.PublishedAt ?? c.CreatedAt)
            .ToList();

        var items = campaigns
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new CampaignListItemDto(c.Id, c.Title, c.BrandLogoUrl, c.Category!.Code))
            .ToList();

        return new PagedResponse<CampaignListItemDto>(items, page, pageSize, campaigns.Count);
    }

    public async Task<Result<CampaignDetailDto>> GetCampaignAsync(Guid id, CancellationToken ct = default)
    {
        var now = timeProvider.GetUtcNow();
        var campaign = await dbContext.Campaigns.AsNoTracking()
            .Include(c => c.Category)
            .FirstOrDefaultAsync(c => c.Id == id && c.Status == ContentStatus.Published, ct);

        if (campaign is null || (campaign.PublishedAt is not null && campaign.PublishedAt > now))
        {
            return Result<CampaignDetailDto>.Fail(new Error(
                ErrorCodes.NotFound, "Kampanya bulunamadı.", 404));
        }

        // Benzer kampanyalar aynı kategoriden gelir, kendisi hariç (PRD §7.6).
        var similar = (await dbContext.Campaigns.AsNoTracking()
                .Where(c => c.CategoryId == campaign.CategoryId
                    && c.Id != campaign.Id
                    && c.Status == ContentStatus.Published)
                .ToListAsync(ct))
            .Where(c => c.PublishedAt == null || c.PublishedAt <= now)
            .OrderByDescending(c => c.PublishedAt ?? c.CreatedAt)
            .Take(5)
            .Select(c => new SimilarCampaignDto(c.Id, c.Title))
            .ToList();

        return Result<CampaignDetailDto>.Ok(new CampaignDetailDto(
            campaign.Id, campaign.Title, campaign.Body, campaign.BrandLogoUrl,
            campaign.DetailUrl, similar));
    }

    public async Task<IReadOnlyList<BenefitItemDto>> GetCouponsAsync(CancellationToken ct = default)
    {
        var coupons = await dbContext.Coupons.AsNoTracking()
            .Where(c => c.Status == ContentStatus.Published)
            .ToListAsync(ct);

        return coupons
            .OrderBy(c => c.ExpiresAt ?? DateTimeOffset.MaxValue)
            .Select(ToItemDto)
            .ToList();
    }

    public async Task<IReadOnlyList<BenefitItemDto>> GetGiftCardsAsync(CancellationToken ct = default)
    {
        var giftCards = await dbContext.GiftCards.AsNoTracking()
            .Where(g => g.Status == ContentStatus.Published)
            .ToListAsync(ct);

        return giftCards
            .OrderBy(g => g.ExpiresAt ?? DateTimeOffset.MaxValue)
            .Select(g => new BenefitItemDto(
                g.Id, g.Title, g.Brand, g.Amount.ToString("F2",
                    System.Globalization.CultureInfo.InvariantCulture), g.ExpiresAt))
            .ToList();
    }

    private static BenefitItemDto ToItemDto(Coupon coupon) => new(
        coupon.Id, coupon.Title, coupon.Brand,
        coupon.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture),
        coupon.ExpiresAt);
}
