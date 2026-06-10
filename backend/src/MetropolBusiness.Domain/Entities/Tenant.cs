using MetropolBusiness.Domain.Enums;

namespace MetropolBusiness.Domain.Entities;

/// <summary>Firma (kiracı) — izolasyon birimi (ARCHITECTURE §4.1 tenants).</summary>
public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Firma kodu — benzersiz, login fallback (PRD §5.1).</summary>
    public string Code { get; set; } = string.Empty;

    public TenantStatus Status { get; set; } = TenantStatus.Pending;

    /// <summary>
    /// Metropol ConsumerId eşlemesi için secret store REFERANSI — değerin kendisi değil.
    /// Gerçek ConsumerId yalnızca environment/secret store'da durur (CLAUDE.md kural 2).
    /// </summary>
    public string? MetropolConsumerRef { get; set; }

    public string? BrandLogoUrl { get; set; }
    public string? BrandPrimaryColor { get; set; }
    public string? BrandSecondaryColor { get; set; }

    /// <summary>Esnek tenant ayarları (jsonb).</summary>
    public string SettingsJson { get; set; } = "{}";

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Segment> Segments { get; set; } = new List<Segment>();
}
