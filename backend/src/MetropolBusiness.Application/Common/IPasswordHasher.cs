namespace MetropolBusiness.Application.Common;

/// <summary>
/// Panel girişi şifre hash'leme soyutlaması (TODO 1.9, PANELS_SPEC §0.4 kararı).
/// Düz şifre asla saklanmaz/log'lanmaz (CLAUDE.md kural 4); yalnızca tek yönlü hash
/// DB'ye yazılır. Implementasyon Infrastructure'dadır (Pbkdf2PasswordHasher) —
/// hash biçimi sürüm bilgisini içerir, ileride algoritma değişirse eski kayıtlar
/// biçim ayrımıyla doğrulanmaya devam eder.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>Şifreyi saklanabilir tek yönlü hash'e çevirir (her çağrıda yeni rastgele salt).</summary>
    string Hash(string password);

    /// <summary>
    /// Şifreyi hash ile karşılaştırır; biçim tanınmıyorsa false döner (exception ile akış
    /// kontrolü yok). Karşılaştırma sabit-zamandır (timing saldırısına dirençli).
    /// </summary>
    bool Verify(string password, string passwordHash);
}
