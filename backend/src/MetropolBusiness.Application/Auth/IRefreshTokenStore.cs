namespace MetropolBusiness.Application.Auth;

/// <summary>
/// Refresh token saklama soyutlaması. Ham token asla saklanmaz; yalnızca SHA256 hash'i
/// kullanıcıya bağlanır (ARCHITECTURE §6: refresh rotasyonlu).
/// </summary>
public interface IRefreshTokenStore
{
    /// <summary>Refresh token hash'ini kullanıcıya bağlar (TTL: JwtOptions.RefreshTokenDays).</summary>
    Task StoreAsync(string tokenHash, Guid userId, TimeSpan ttl, CancellationToken cancellationToken = default);

    /// <summary>
    /// Hash'i okur ve SİLER (rotasyon: oku+sil niyeti) — aynı refresh ikinci kez kullanılamaz.
    /// Kayıt yoksa null döner.
    /// </summary>
    Task<Guid?> TakeAsync(string tokenHash, CancellationToken cancellationToken = default);
}
