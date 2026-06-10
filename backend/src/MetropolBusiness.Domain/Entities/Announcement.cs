using MetropolBusiness.Domain.Enums;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Duyuru (ARCHITECTURE §4.3 announcements). DİKKAT: TenantId NULLABLE —
/// null = platform/global içerik, tüm tenant'larda görünür (ARCHITECTURE §3.4).
/// Bu yüzden ITenantOwned UYGULANMAZ; query filter AppDbContext'te ÖZEL yazılır:
/// (TenantId == null || TenantId == aktif tenant). Firma admin yalnızca kendi
/// tenant'ının duyurularını yönetebilir; global içerik platform admin'indir.
/// </summary>
public class Announcement : BaseEntity
{
    /// <summary>Null = global (platform) duyuru; dolu = yalnızca o firmanın duyurusu.</summary>
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string? CoverUrl { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public ContentStatus Status { get; set; } = ContentStatus.Draft;
    public DateTimeOffset? PublishedAt { get; set; }

    /// <summary>Oluşturan kullanıcı (firma admin ya da platform admin).</summary>
    public Guid CreatedBy { get; set; }

    /// <summary>Segment hedefleme — boşsa tenant'taki herkese görünür (ARCHITECTURE §4.3).</summary>
    public ICollection<AnnouncementSegment> Segments { get; set; } = new List<AnnouncementSegment>();
}
