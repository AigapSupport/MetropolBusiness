using MetropolBusiness.Domain.Enums;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kupon (ARCHITECTURE §4.4 coupons — ilk sürüm temel liste, PRD §7).
/// Announcement deseni: TenantId NULLABLE — null = platform/global kupon, tüm
/// tenant'larda görünür; ITenantOwned UYGULANMAZ, query filter AppDbContext'te ÖZEL.
/// Tutar para olduğundan decimal'dir (CLAUDE.md kural 5); itfa/kullanım akışı
/// sonraki fazda (PRD §17.4 kararıyla aynı yaklaşım).
/// </summary>
public class Coupon : BaseEntity
{
    /// <summary>Null = global (platform) kupon; dolu = yalnızca o firmanın kuponu.</summary>
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;

    /// <summary>Kupon tutarı — DB'de numeric(18,2), API'de string "100.00".</summary>
    public decimal Amount { get; set; }

    public DateTimeOffset? ExpiresAt { get; set; }

    public ContentStatus Status { get; set; } = ContentStatus.Draft;
}
