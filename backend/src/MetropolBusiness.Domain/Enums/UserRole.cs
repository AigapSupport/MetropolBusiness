namespace MetropolBusiness.Domain.Enums;

/// <summary>
/// Basit rol enum'u (PRD §17.9). DB'de text saklanır.
/// PlatformAdmin tenant-üstüdür; tenant kullanıcılarında kullanılmaz.
/// </summary>
public enum UserRole
{
    EndUser,
    CompanyAdmin,
    Approver,
    PlatformAdmin,
}
