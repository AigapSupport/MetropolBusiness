using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Audit;

/// <summary>
/// Denetim kaydı listesi (PANELS_SPEC B.8) — yalnızca PlatformAdmin ucundan çağrılır.
/// Tarih filtreleri ve sıralama bellekte: SQLite (test) DateTimeOffset karşılaştırmasını
/// çeviremez (repo genel deseni); hacim büyüyünce Postgres'e özgü sorguya alınır.
/// </summary>
public sealed class AuditQueryService(AppDbContext dbContext) : IAuditQueryService
{
    public async Task<PagedResponse<AuditLogDto>> GetAsync(
        string? action, string? entity, DateTimeOffset? from, DateTimeOffset? to,
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = dbContext.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(a => a.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(entity))
        {
            query = query.Where(a => a.Entity == entity);
        }

        var rows = (await query.ToListAsync(ct))
            .Where(a => from is null || a.CreatedAt >= from)
            .Where(a => to is null || a.CreatedAt <= to)
            .OrderByDescending(a => a.CreatedAt)
            .ToList();

        var items = rows
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id, a.TenantId, a.ActorId, a.Action, a.Entity, a.EntityId,
                a.MetadataJson, a.CreatedAt))
            .ToList();

        return new PagedResponse<AuditLogDto>(items, page, pageSize, rows.Count);
    }
}
