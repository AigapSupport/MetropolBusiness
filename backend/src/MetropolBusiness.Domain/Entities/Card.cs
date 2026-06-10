using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kullanıcı-kart bağı (ARCHITECTURE §4.2 cards). Bakiye/işlem verisi SAKLANMAZ,
/// Metropol'den canlı çekilir; yalnızca bağ + token tutulur.
/// UserAccountToken at-rest ŞİFRELİ saklanır (IFieldCipher) — düz token kolonu yoktur
/// ve token hiçbir log'a yazılmaz (CLAUDE.md kural 4).
/// </summary>
public class Card : BaseEntity, ITenantOwned, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Şifrelenmiş Metropol UserAccountToken — düz metin asla saklanmaz/log'lanmaz.</summary>
    public string UserAccountTokenEncrypted { get; set; } = string.Empty;

    /// <summary>Maskeli kart no ("637******976") — maskeleme backend'de yapılmış halde saklanır.</summary>
    public string MaskedCardNo { get; set; } = string.Empty;

    /// <summary>Kart sahibi ad-soyad (Metropol AddAccountConfirm yanıtından).</summary>
    public string? HolderName { get; set; }

    public EntityStatus Status { get; set; } = EntityStatus.Active;

    /// <summary>Kart silme = soft-delete (yalnızca kullanıcının kart bağı kaldırılır, PRD §8.8).</summary>
    public DateTimeOffset? DeletedAt { get; set; }
}
