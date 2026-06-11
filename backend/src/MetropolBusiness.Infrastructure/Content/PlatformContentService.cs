using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Content;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Content;

/// <summary>
/// Platform admin GLOBAL duyuru CRUD'u (PANELS_SPEC B.5). Platform admin tenant-üstüdür:
/// sorgular IgnoreQueryFilters + açık TenantId == null filtresiyle çalışır
/// (ARCHITECTURE §3.3 — tenant bağlamı olmayan istekte query filter hiçbir şey döndürmezdi).
/// </summary>
public sealed class PlatformContentService(AppDbContext dbContext, TimeProvider timeProvider)
    : IPlatformContentService
{
    public async Task<PagedResponse<AdminAnnouncementDto>> GetAnnouncementsAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        var announcements = await dbContext.Announcements.IgnoreQueryFilters().AsNoTracking()
            .Where(a => a.TenantId == null)
            .ToListAsync(ct);

        var ordered = announcements.OrderByDescending(a => a.CreatedAt).ToList();
        var items = ordered
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(ToDto)
            .ToList();

        return new PagedResponse<AdminAnnouncementDto>(items, page, pageSize, ordered.Count);
    }

    public async Task<Result<AdminAnnouncementDto>> CreateAsync(
        AnnouncementUpsertRequest request, CancellationToken ct = default)
    {
        var statusResult = ParseStatus(request.Status);
        if (!statusResult.IsSuccess)
        {
            return Result<AdminAnnouncementDto>.Fail(statusResult.Error!);
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return Result<AdminAnnouncementDto>.Fail(TitleRequired);
        }

        var announcement = new Announcement
        {
            TenantId = null, // Global içerik: tüm firmalarda görünür (segment hedefleme yok).
            Title = request.Title.Trim(),
            Body = request.Body,
            CoverUrl = request.CoverUrl,
            Status = statusResult.Value,
            PublishedAt = ResolvePublishedAt(statusResult.Value, request.PublishedAt),
        };
        dbContext.Announcements.Add(announcement);
        await dbContext.SaveChangesAsync(ct);

        return Result<AdminAnnouncementDto>.Ok(ToDto(announcement));
    }

    public async Task<Result<AdminAnnouncementDto>> UpdateAsync(
        Guid id, AnnouncementUpsertRequest request, CancellationToken ct = default)
    {
        var statusResult = ParseStatus(request.Status);
        if (!statusResult.IsSuccess)
        {
            return Result<AdminAnnouncementDto>.Fail(statusResult.Error!);
        }

        var announcement = await dbContext.Announcements.IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == null, ct);
        if (announcement is null)
        {
            return Result<AdminAnnouncementDto>.Fail(NotFound);
        }

        announcement.Title = request.Title.Trim();
        announcement.Body = request.Body;
        announcement.CoverUrl = request.CoverUrl;
        announcement.Status = statusResult.Value;
        announcement.PublishedAt =
            ResolvePublishedAt(statusResult.Value, request.PublishedAt) ?? announcement.PublishedAt;
        await dbContext.SaveChangesAsync(ct);

        return Result<AdminAnnouncementDto>.Ok(ToDto(announcement));
    }

    public async Task<Result<bool>> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var announcement = await dbContext.Announcements.IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == null, ct);
        if (announcement is null)
        {
            return Result<bool>.Fail(NotFound);
        }

        dbContext.Announcements.Remove(announcement);
        await dbContext.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    private DateTimeOffset? ResolvePublishedAt(ContentStatus status, DateTimeOffset? requested) =>
        status == ContentStatus.Published ? requested ?? timeProvider.GetUtcNow() : requested;

    private static AdminAnnouncementDto ToDto(Announcement announcement) => new(
        announcement.Id, announcement.Title, announcement.Body, announcement.CoverUrl,
        ContentEnumMapping.StatusToWire(announcement.Status), announcement.PublishedAt, []);

    private static Result<ContentStatus> ParseStatus(string status) => status switch
    {
        "draft" => Result<ContentStatus>.Ok(ContentStatus.Draft),
        "published" => Result<ContentStatus>.Ok(ContentStatus.Published),
        _ => Result<ContentStatus>.Fail(new Error(
            ErrorCodes.ValidationError, "Geçersiz durum (draft|published).", 400,
            new { field = "status" })),
    };

    private static readonly Error NotFound = new(ErrorCodes.NotFound, "Duyuru bulunamadı.", 404);
    private static readonly Error TitleRequired =
        new(ErrorCodes.ValidationError, "Başlık zorunludur.", 400, new { field = "title" });
}
