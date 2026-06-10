using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kayıtlı transfer alıcısı (ARCHITECTURE §4.2 saved_recipients, PRD §8.7).
/// Alıcı token'ı at-rest ŞİFRELİ saklanır (IFieldCipher); kart no yalnızca maskeli tutulur.
/// Transfer uçları Faz 1.7'de bu tabloyu kullanır.
/// </summary>
public class SavedRecipient : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Kullanıcının verdiği kayıt adı ("Tanımlı alıcı olarak ekle" + kayıt adı).</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Maskeli alıcı kart no — maskesiz kart no saklanmaz (CLAUDE.md kural 4).</summary>
    public string MaskedCardNo { get; set; } = string.Empty;

    /// <summary>Şifrelenmiş alıcı kart token'ı — düz metin asla saklanmaz/log'lanmaz.</summary>
    public string RecipientTokenEncrypted { get; set; } = string.Empty;
}
