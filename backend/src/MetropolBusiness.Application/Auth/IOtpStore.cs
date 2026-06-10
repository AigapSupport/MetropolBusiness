namespace MetropolBusiness.Application.Auth;

/// <summary>
/// Saklanan OTP kaydı. Kod yalnızca SHA256 hash olarak taşınır/saklanır — düz kod asla
/// saklanmaz ve hiçbir log'a yazılmaz (CLAUDE.md kural 4).
/// </summary>
public sealed record OtpEntry(string CodeHash, string Phone, Guid UserId, int Attempts);

/// <summary>OTP saklama soyutlaması (Redis/IDistributedCache implementasyonu Infrastructure'da).</summary>
public interface IOtpStore
{
    /// <summary>OTP kaydını TTL ile saklar (attempts = 0 ile başlar).</summary>
    Task StoreAsync(string otpRef, OtpEntry entry, TimeSpan ttl, CancellationToken cancellationToken = default);

    /// <summary>Kaydı okur; yoksa/süresi dolduysa null.</summary>
    Task<OtpEntry?> GetAsync(string otpRef, CancellationToken cancellationToken = default);

    /// <summary>Hatalı deneme sayısını 1 artırır ve yeni değeri döner (kayıt yoksa 0).</summary>
    Task<int> IncrementAttemptsAsync(string otpRef, CancellationToken cancellationToken = default);

    /// <summary>Kaydı siler (başarılı doğrulama sonrası tek kullanım).</summary>
    Task RemoveAsync(string otpRef, CancellationToken cancellationToken = default);
}
