using MetropolBusiness.Domain.Enums;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kampanya (ARCHITECTURE §4.4 campaigns, PRD §7 Yan Haklar). DİKKAT: Announcement
/// deseni — TenantId NULLABLE; null = platform/global kampanya (Avantajlar Dünyası),
/// tüm tenant'larda görünür (ARCHITECTURE §3.4). Bu yüzden ITenantOwned UYGULANMAZ;
/// query filter AppDbContext'te ÖZEL yazılır: (TenantId == null || TenantId == aktif tenant).
/// </summary>
public class Campaign : BaseEntity
{
    /// <summary>Null = global (platform) kampanya; dolu = yalnızca o firmanın kampanyası.</summary>
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid CategoryId { get; set; }
    public CampaignCategory? Category { get; set; }

    public string? BrandLogoUrl { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    /// <summary>"Detaylı Bilgi Al" butonunun hedef linki (PRD §7.2).</summary>
    public string? DetailUrl { get; set; }

    public ContentStatus Status { get; set; } = ContentStatus.Draft;
    public DateTimeOffset? PublishedAt { get; set; }
}
