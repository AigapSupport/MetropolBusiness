using MetropolBusiness.Domain.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace MetropolBusiness.Infrastructure.Persistence;

/// <summary>
/// Enum ↔ DB text dönüşümleri. DB değerleri ARCHITECTURE §4.1 sözlüğüyle birebir:
/// enduser/company_admin/approver, active/passive/pending.
/// (ValueConverter expression tree ister; switch'ler statik metotlara taşındı.)
/// </summary>
internal static class EnumConverters
{
    public static readonly ValueConverter<UserRole, string> UserRoleConverter =
        new(role => UserRoleToDb(role), value => UserRoleFromDb(value));

    public static readonly ValueConverter<EntityStatus, string> EntityStatusConverter =
        new(status => EntityStatusToDb(status), value => EntityStatusFromDb(value));

    public static readonly ValueConverter<TenantStatus, string> TenantStatusConverter =
        new(status => TenantStatusToDb(status), value => TenantStatusFromDb(value));

    private static string UserRoleToDb(UserRole role) => role switch
    {
        UserRole.EndUser => "enduser",
        UserRole.CompanyAdmin => "company_admin",
        UserRole.Approver => "approver",
        UserRole.PlatformAdmin => "platform_admin",
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, null),
    };

    private static UserRole UserRoleFromDb(string value) => value switch
    {
        "enduser" => UserRole.EndUser,
        "company_admin" => UserRole.CompanyAdmin,
        "approver" => UserRole.Approver,
        "platform_admin" => UserRole.PlatformAdmin,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    private static string EntityStatusToDb(EntityStatus status) => status switch
    {
        EntityStatus.Active => "active",
        EntityStatus.Passive => "passive",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    private static EntityStatus EntityStatusFromDb(string value) => value switch
    {
        "active" => EntityStatus.Active,
        "passive" => EntityStatus.Passive,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    private static string TenantStatusToDb(TenantStatus status) => status switch
    {
        TenantStatus.Pending => "pending",
        TenantStatus.Active => "active",
        TenantStatus.Passive => "passive",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    private static TenantStatus TenantStatusFromDb(string value) => value switch
    {
        "pending" => TenantStatus.Pending,
        "active" => TenantStatus.Active,
        "passive" => TenantStatus.Passive,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };
}
