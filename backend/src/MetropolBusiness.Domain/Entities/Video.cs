using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>Eğitim videosu (ARCHITECTURE §4.3 videos). Yalnızca kendi tenant'ında görünür.</summary>
public class Video : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }

    public int DurationSeconds { get; set; }

    /// <summary>Zorunlu eğitim mi (mobilde rozetle gösterilir).</summary>
    public bool Mandatory { get; set; }

    public ICollection<VideoWatch> Watches { get; set; } = new List<VideoWatch>();
}
