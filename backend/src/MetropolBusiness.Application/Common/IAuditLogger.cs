namespace MetropolBusiness.Application.Common;

/// <summary>
/// Kritik işlem denetimi (PANELS_SPEC B.8). Metadata'ya PII KONMAZ — yalnızca
/// kod/durum gibi alanlar (CLAUDE.md kural 4). Aktör istek bağlamından alınır.
/// </summary>
public interface IAuditLogger
{
    Task LogAsync(
        string action, string entity, string entityId,
        object? metadata = null, Guid? tenantId = null,
        CancellationToken ct = default);
}
