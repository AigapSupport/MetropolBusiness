using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Api.Auth;

/// <summary>
/// Endpoint guard policy'leri (TODO 1.1). Kullanım: [Authorize(Policy = PolicyNames.CompanyAdmin)].
/// Modül yetkisi (segment_modules) kontrolü Faz 2.4'te ayrı bir handler ile eklenecek.
/// </summary>
public static class PolicyNames
{
    public const string PlatformAdmin = "PlatformAdmin";
    public const string CompanyAdmin = "CompanyAdmin";
    public const string Approver = "Approver";
    public const string TenantUser = "TenantUser";
}

public static class AuthorizationPolicyExtensions
{
    public static IServiceCollection AddAppAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            // Platform admin: tenant-üstü; platform_admin claim'i zorunlu.
            options.AddPolicy(PolicyNames.PlatformAdmin, policy =>
                policy.RequireClaim(AppClaimTypes.PlatformAdmin, "true"));

            // Firma admin: yalnızca kendi tenant'ı (tenant_id claim'i de zorunlu).
            options.AddPolicy(PolicyNames.CompanyAdmin, policy =>
            {
                policy.RequireClaim(AppClaimTypes.Role, RoleNames.CompanyAdmin);
                policy.RequireClaim(AppClaimTypes.TenantId);
            });

            // Onaylayan: approver veya company_admin.
            options.AddPolicy(PolicyNames.Approver, policy =>
            {
                policy.RequireClaim(AppClaimTypes.Role, RoleNames.Approver, RoleNames.CompanyAdmin);
                policy.RequireClaim(AppClaimTypes.TenantId);
            });

            // Herhangi bir tenant kullanıcısı (mobil uçların tabanı).
            options.AddPolicy(PolicyNames.TenantUser, policy =>
                policy.RequireClaim(AppClaimTypes.TenantId));
        });

        return services;
    }
}
