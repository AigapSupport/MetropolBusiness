namespace MetropolBusiness.Application.Common;

/// <summary>JWT claim adları (ARCHITECTURE §6: sub, tenant_id, role, member_id).</summary>
public static class AppClaimTypes
{
    public const string Subject = "sub";
    public const string TenantId = "tenant_id";
    public const string Role = "role";
    public const string MemberId = "member_id";
    public const string PlatformAdmin = "platform_admin";
}

/// <summary>JWT'deki rol claim değerleri (DB ile aynı snake_case sözlük).</summary>
public static class RoleNames
{
    public const string EndUser = "enduser";
    public const string CompanyAdmin = "company_admin";
    public const string Approver = "approver";
    public const string PlatformAdmin = "platform_admin";
}
