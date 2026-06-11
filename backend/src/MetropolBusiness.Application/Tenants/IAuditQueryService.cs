using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Tenants;

/// <summary>docs/API_CONTRACT.md §13 — denetim kaydı görünümü (salt-okunur, PII'siz).</summary>
public sealed record AuditLogDto(
    Guid Id, Guid? TenantId, Guid? ActorId, string Action, string Entity,
    string EntityId, string Metadata, DateTimeOffset CreatedAt);

/// <summary>GET /platform/audit-logs ?action&entity&from&to&page (PANELS_SPEC B.8).</summary>
public interface IAuditQueryService
{
    Task<PagedResponse<AuditLogDto>> GetAsync(
        string? action, string? entity, DateTimeOffset? from, DateTimeOffset? to,
        int page, int pageSize, CancellationToken ct = default);
}
