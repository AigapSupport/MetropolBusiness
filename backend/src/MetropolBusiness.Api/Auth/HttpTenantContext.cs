using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Api.Auth;

/// <summary>
/// İstekteki JWT claim'lerinden tenant bağlamını okur (request scoped, ARCHITECTURE §3.2).
/// tenant_id header'dan ALINMAZ — yalnızca imzalı token claim'i (API_CONTRACT §0.1).
/// </summary>
public sealed class HttpTenantContext(IHttpContextAccessor httpContextAccessor) : ITenantContext
{
    public Guid? TenantId
    {
        get
        {
            var value = GetClaim(AppClaimTypes.TenantId);
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid? UserId
    {
        get
        {
            var value = GetClaim(AppClaimTypes.Subject);
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public bool IsPlatformAdmin => GetClaim(AppClaimTypes.PlatformAdmin) == "true";

    public Guid RequiredTenantId => TenantId
        ?? throw new InvalidOperationException(
            "Tenant bağlamı yok: bu işlem tenant claim'li bir kullanıcı gerektirir.");

    private string? GetClaim(string type) =>
        httpContextAccessor.HttpContext?.User.FindFirst(type)?.Value;
}
