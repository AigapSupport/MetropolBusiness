using MetropolBusiness.Domain.Enums;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Hediye çeki (ARCHITECTURE §4.4 gift_cards — ilk sürüm yalnız listeleme,
/// PRD §17.4 kararı: itfa/kullanım akışı sonraki sürümde).
/// Announcement deseni: TenantId NULLABLE — null = platform/global çek, tüm
/// tenant'larda görünür; ITenantOwned UYGULANMAZ, query filter AppDbContext'te ÖZEL.
/// </summary>
public class GiftCard : BaseEntity
{
    /// <summary>Null = global (platform) çek; dolu = yalnızca o firmanın çeki.</summary>
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;

    /// <summary>Çek tutarı — DB'de numeric(18,2), API'de string "100.00".</summary>
    public decimal Amount { get; set; }

    public DateTimeOffset? ExpiresAt { get; set; }

    public ContentStatus Status { get; set; } = ContentStatus.Draft;
}
