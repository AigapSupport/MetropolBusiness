using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;

namespace MetropolBusiness.Infrastructure.Tenants;

/// <summary>
/// Kimlik enum ↔ sözleşme string eşlemesi (rol/durum). Tel (API_CONTRACT §12/§13) ve DB
/// (ARCHITECTURE §4.1) aynı sözlüğü kullanır; tek doğru kaynak EnumConverters'tır,
/// burada köprülenir (ContentEnumMapping deseni). Parse metotları kullanıcı girdisi
/// için toleranslıdır (null döner, exception atmaz).
/// </summary>
internal static class IdentityEnumMapping
{
    public static string RoleToWire(UserRole role) => EnumConverters.UserRoleToDb(role);

    /// <summary>
    /// Firma admin'in atayabileceği roller — platform_admin BİLİNÇLİ olarak yok:
    /// tenant kullanıcısı tenant-üstü role yükseltilemez (CLAUDE.md §5).
    /// </summary>
    public static UserRole? ParseTenantRole(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "enduser" => UserRole.EndUser,
        "company_admin" => UserRole.CompanyAdmin,
        "approver" => UserRole.Approver,
        _ => null,
    };

    public static string StatusToWire(EntityStatus status) => EnumConverters.EntityStatusToDb(status);

    public static EntityStatus? ParseEntityStatus(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "active" => EntityStatus.Active,
        "passive" => EntityStatus.Passive,
        _ => null,
    };

    public static string TenantStatusToWire(TenantStatus status) =>
        EnumConverters.TenantStatusToDb(status);

    public static TenantStatus? ParseTenantStatus(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "pending" => TenantStatus.Pending,
        "active" => TenantStatus.Active,
        "passive" => TenantStatus.Passive,
        _ => null,
    };
}
