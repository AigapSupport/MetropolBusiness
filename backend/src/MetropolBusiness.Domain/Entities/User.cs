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

    /// <summary>
    /// Panel girişi şifre hash'i (PBKDF2, "pbkdf2$..." biçimi) — YALNIZCA panel
    /// kullanıcılarında (company_admin/approver/platform_admin) doludur; mobil son
    /// kullanıcı OTP ile girer ve bu alan null kalır. Düz şifre asla saklanmaz/log'lanmaz.
    /// </summary>
    public string? PasswordHash { get; set; }

    public string? City { get; set; }
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Bildirim/izin tercihleri (jsonb) — API_CONTRACT §2 /me/preferences.
    /// Sözleşme alanları camelCase JSON olarak saklanır; boş nesne = varsayılanlar.
    /// </summary>
    public string PreferencesJson { get; set; } = "{}";

    public UserRole Role { get; set; } = UserRole.EndUser;

    /// <summary>Metropol MemberId — kullanıcının ödeme kuruluşundaki benzersiz numarası.</summary>
    public string? MemberId { get; set; }

    /// <summary>
    /// MemberId boşsa Id'den otomatik atar (KARAR 2026-06-11: her kullanıcının bir Metropol
    /// MemberId'si olur). Biçim: Id'nin 32 hex hali ("N") — benzersizdir, ek sekans
    /// altyapısı gerektirmez. Dolu MemberId'ye DOKUNULMAZ (elle atanmış değer korunur).
    /// VARSAYIM (LESSONS.md): Metropol MemberId uzunluk/biçim sınırı belgesiz; 32 hex
    /// kabul edildi, Metropol test ortamında teyit edilecek.
    /// </summary>
    public void EnsureMemberId()
    {
        if (string.IsNullOrWhiteSpace(MemberId))
        {
            MemberId = Id.ToString("N");
        }
    }

    public EntityStatus Status { get; set; } = EntityStatus.Active;
    public DateTimeOffset? DeletedAt { get; set; }

    public ICollection<UserSegment> UserSegments { get; set; } = new List<UserSegment>();
}
