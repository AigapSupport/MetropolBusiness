namespace MetropolBusiness.Application.Auth;

/// <summary>Basit pencere tabanlı oran sınırlayıcı (CLAUDE.md §8: OTP/login uçlarında rate-limit).</summary>
public interface IRateLimiter
{
    /// <summary>
    /// Pencere içindeki İLK istekse true döner ve pencereyi başlatır;
    /// pencere dolana kadar sonraki istekler false alır.
    /// </summary>
    Task<bool> TryAcquireAsync(string key, TimeSpan window, CancellationToken cancellationToken = default);

    /// <summary>
    /// Pencere içinde en fazla maxCount edinime izin verir (örn. panel login: e-posta
    /// başına 10/dk). Pencere ilk edinimle başlar; sınır aşılınca pencere dolana kadar
    /// false döner.
    /// </summary>
    Task<bool> TryAcquireAsync(
        string key, TimeSpan window, int maxCount, CancellationToken cancellationToken = default);
}
