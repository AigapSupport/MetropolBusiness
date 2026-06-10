namespace MetropolBusiness.Application.Common;

/// <summary>
/// İstek bazlı tenant bağlamı — JWT claim'lerinden okunur (ARCHITECTURE §3.2).
/// Tenant'a ait her veri erişimi bu bağlamla filtrelenir; tenant scope'suz sorgu yazılmaz
/// (CLAUDE.md kural 1).
/// </summary>
public interface ITenantContext
{
    /// <summary>İstek sahibinin firması. Platform admin'de null (tenant-üstü).</summary>
    Guid? TenantId { get; }

    /// <summary>İstek sahibi kullanıcı (JWT sub). Anonim uçlarda null.</summary>
    Guid? UserId { get; }

    /// <summary>Platform (Metropol) admin — tenant-üstü tek istisna.</summary>
    bool IsPlatformAdmin { get; }

    /// <summary>Tenant zorunlu uçlarda kullanılır; bağlam yoksa exception fırlatır.</summary>
    Guid RequiredTenantId { get; }
}
