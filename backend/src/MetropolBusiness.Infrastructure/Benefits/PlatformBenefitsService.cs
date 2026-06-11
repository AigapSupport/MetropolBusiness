using MetropolBusiness.Application.Benefits;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Benefits;

/// <summary>
/// Platform admin kampanya/kategori CRUD'u (PANELS_SPEC B.6/B.7). Platform admin
/// tenant-üstüdür ve içerik GLOBAL (TenantId = null) yazılır; sorgular bu yüzden
/// IgnoreQueryFilters + açık TenantId == null filtresiyle çalışır (ARCHITECTURE §3.3 —
/// tenant bağlamı olmayan istekte query filter hiçbir şey döndürmezdi).
/// </summary>
public sealed class PlatformBenefitsService(AppDbContext dbContext, TimeProvider timeProvider)
    : IPlatformBenefitsService
{
    public async Task<IReadOnlyList<AdminCategoryDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        var categories = await dbContext.CampaignCategories.AsNoTracking()
            .Include(c => c.Campaigns)
            .ToListAsync(ct);

        return categories
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new AdminCategoryDto(c.Id, c.Code, c.Name, c.SortOrder, c.Campaigns.Count))
            .ToList();
    }

    public async Task<Result<AdminCategoryDto>> CreateCategoryAsync(
        CategoryUpsertRequest request, CancellationToken ct = default)
    {
        var validation = ValidateCategory(request);
        if (validation is not null)
        {
            return Result<AdminCategoryDto>.Fail(validation);
        }

        var code = request.Code.Trim().ToLowerInvariant();
        if (await dbContext.CampaignCategories.AnyAsync(c => c.Code == code, ct))
        {
            return Result<AdminCategoryDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Bu kodla bir kategori zaten var.", 400,
                new { field = "code" }));
        }

        var category = new CampaignCategory
        {
            Code = code,
            Name = request.Name.Trim(),
            SortOrder = request.SortOrder,
        };
        dbContext.CampaignCategories.Add(category);
        await dbContext.SaveChangesAsync(ct);

        return Result<AdminCategoryDto>.Ok(
            new AdminCategoryDto(category.Id, category.Code, category.Name, category.SortOrder, 0));
    }

    public async Task<Result<AdminCategoryDto>> UpdateCategoryAsync(
        Guid id, CategoryUpsertRequest request, CancellationToken ct = default)
    {
        var validation = ValidateCategory(request);
        if (validation is not null)
        {
            return Result<AdminCategoryDto>.Fail(validation);
        }

        var category = await dbContext.CampaignCategories
            .Include(c => c.Campaigns)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null)
        {
            return Result<AdminCategoryDto>.Fail(CategoryNotFound);
        }

        var code = request.Code.Trim().ToLowerInvariant();
        if (await dbContext.CampaignCategories.AnyAsync(c => c.Code == code && c.Id != id, ct))
        {
            return Result<AdminCategoryDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Bu kodla bir kategori zaten var.", 400,
                new { field = "code" }));
        }

        category.Code = code;
        category.Name = request.Name.Trim();
        category.SortOrder = request.SortOrder;
        await dbContext.SaveChangesAsync(ct);

        return Result<AdminCategoryDto>.Ok(new AdminCategoryDto(
            category.Id, category.Code, category.Name, category.SortOrder, category.Campaigns.Count));
    }

    public async Task<Result<bool>> DeleteCategoryAsync(Guid id, CancellationToken ct = default)
    {
        var category = await dbContext.CampaignCategories
            .Include(c => c.Campaigns)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null)
        {
            return Result<bool>.Fail(CategoryNotFound);
        }

        // Kampanyası olan kategori silinmez (FK Restrict + anlamlı mesaj).
        if (category.Campaigns.Count > 0)
        {
            return Result<bool>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Bu kategoride kampanyalar var; önce kampanyaları taşıyın/silin.", 400,
                new { campaignCount = category.Campaigns.Count }));
        }

        dbContext.CampaignCategories.Remove(category);
        await dbContext.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    public async Task<PagedResponse<AdminCampaignDto>> GetCampaignsAsync(
        string? categoryCode, int page, int pageSize, CancellationToken ct = default)
    {
        // Platform admin tenant-üstü: global filtre bağlamı yok (ARCHITECTURE §3.3 gerekçesi).
        var query = dbContext.Campaigns.IgnoreQueryFilters().AsNoTracking()
            .Include(c => c.Category)
            .Where(c => c.TenantId == null);

        if (!string.IsNullOrWhiteSpace(categoryCode))
        {
            query = query.Where(c => c.Category!.Code == categoryCode);
        }

        var campaigns = (await query.ToListAsync(ct))
            .OrderByDescending(c => c.CreatedAt)
            .ToList();

        var items = campaigns
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(ToAdminDto)
            .ToList();

        return new PagedResponse<AdminCampaignDto>(items, page, pageSize, campaigns.Count);
    }

    public async Task<Result<AdminCampaignDto>> CreateCampaignAsync(
        CampaignUpsertRequest request, CancellationToken ct = default)
    {
        var statusResult = ParseStatus(request.Status);
        if (!statusResult.IsSuccess)
        {
            return Result<AdminCampaignDto>.Fail(statusResult.Error!);
        }

        var category = await dbContext.CampaignCategories
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId, ct);
        if (category is null)
        {
            return Result<AdminCampaignDto>.Fail(CategoryNotFound);
        }

        var campaign = new Campaign
        {
            TenantId = null, // Global içerik: tüm firmalarda görünür (PANELS_SPEC B.6).
            CategoryId = category.Id,
            Title = request.Title.Trim(),
            Body = request.Body,
            BrandLogoUrl = request.BrandLogoUrl,
            DetailUrl = request.DetailUrl,
            Status = statusResult.Value,
            PublishedAt = ResolvePublishedAt(statusResult.Value, request.PublishedAt),
        };
        dbContext.Campaigns.Add(campaign);
        await dbContext.SaveChangesAsync(ct);

        campaign.Category = category;
        return Result<AdminCampaignDto>.Ok(ToAdminDto(campaign));
    }

    public async Task<Result<AdminCampaignDto>> UpdateCampaignAsync(
        Guid id, CampaignUpsertRequest request, CancellationToken ct = default)
    {
        var statusResult = ParseStatus(request.Status);
        if (!statusResult.IsSuccess)
        {
            return Result<AdminCampaignDto>.Fail(statusResult.Error!);
        }

        var campaign = await dbContext.Campaigns.IgnoreQueryFilters()
            .Include(c => c.Category)
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == null, ct);
        if (campaign is null)
        {
            return Result<AdminCampaignDto>.Fail(CampaignNotFound);
        }

        var category = await dbContext.CampaignCategories
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId, ct);
        if (category is null)
        {
            return Result<AdminCampaignDto>.Fail(CategoryNotFound);
        }

        campaign.CategoryId = category.Id;
        campaign.Category = category;
        campaign.Title = request.Title.Trim();
        campaign.Body = request.Body;
        campaign.BrandLogoUrl = request.BrandLogoUrl;
        campaign.DetailUrl = request.DetailUrl;
        campaign.Status = statusResult.Value;
        campaign.PublishedAt = ResolvePublishedAt(statusResult.Value, request.PublishedAt)
            ?? campaign.PublishedAt;
        await dbContext.SaveChangesAsync(ct);

        return Result<AdminCampaignDto>.Ok(ToAdminDto(campaign));
    }

    public async Task<Result<bool>> DeleteCampaignAsync(Guid id, CancellationToken ct = default)
    {
        var campaign = await dbContext.Campaigns.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == id && c.TenantId == null, ct);
        if (campaign is null)
        {
            return Result<bool>.Fail(CampaignNotFound);
        }

        dbContext.Campaigns.Remove(campaign);
        await dbContext.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    private DateTimeOffset? ResolvePublishedAt(ContentStatus status, DateTimeOffset? requested) =>
        status == ContentStatus.Published
            ? requested ?? timeProvider.GetUtcNow()
            : requested;

    private static Error? ValidateCategory(CategoryUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return new Error(ErrorCodes.ValidationError, "Kod ve ad zorunludur.", 400);
        }

        return null;
    }

    private static Result<ContentStatus> ParseStatus(string status) => status switch
    {
        "draft" => Result<ContentStatus>.Ok(ContentStatus.Draft),
        "published" => Result<ContentStatus>.Ok(ContentStatus.Published),
        _ => Result<ContentStatus>.Fail(new Error(
            ErrorCodes.ValidationError, "Geçersiz durum (draft|published).", 400,
            new { field = "status" })),
    };

    private static AdminCampaignDto ToAdminDto(Campaign campaign) => new(
        campaign.Id, campaign.CategoryId, campaign.Category!.Code, campaign.Title,
        campaign.Body, campaign.BrandLogoUrl, campaign.DetailUrl,
        EnumConverterText(campaign.Status), campaign.PublishedAt);

    private static string EnumConverterText(ContentStatus status) =>
        status == ContentStatus.Published ? "published" : "draft";

    private static readonly Error CategoryNotFound =
        new(ErrorCodes.NotFound, "Kategori bulunamadı.", 404);

    private static readonly Error CampaignNotFound =
        new(ErrorCodes.NotFound, "Kampanya bulunamadı.", 404);
}
