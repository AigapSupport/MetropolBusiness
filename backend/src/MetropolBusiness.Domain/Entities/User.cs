using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kullanıcı (ARCHITECTURE §4.1 users). Telefon login anahtarıdır; tenant içinde benzersiz.
/// TCKN at-rest şifreli saklanır (ARCHITECTURE §10) — şifreleme Infrastructure'da uygulanır.
/// </summary>
public class User : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Phone { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }

    /// <summary>Şifrelenmiş TCKN — düz metin asla saklanmaz/log'lanmaz (CLAUDE.md kural 4).</summary>
    public string? TcknEncrypted { get; set; }

    public string? City { get; set; }
    public string? AvatarUrl { get; set; }

    public UserRole Role { get; set; } = UserRole.EndUser;

    /// <summary>Metropol MemberId — kullanıcının ödeme kuruluşundaki benzersiz numarası.</summary>
    public string? MemberId { get; set; }

    public EntityStatus Status { get; set; } = EntityStatus.Active;
    public DateTimeOffset? DeletedAt { get; set; }

    public ICollection<UserSegment> UserSegments { get; set; } = new List<UserSegment>();
}
