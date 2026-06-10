namespace MetropolBusiness.Infrastructure.Cache;

/// <summary>Redis bağlantı ayarları (Metropol token cache, OTP, rate-limit — ARCHITECTURE §9).</summary>
public sealed class RedisOptions
{
    public const string SectionName = "Redis";

    /// <summary>
    /// false (varsayılan): IDistributedCache in-memory çalışır (tek instance geliştirme/test).
    /// true: AddStackExchangeRedisCache ile Redis kullanılır (çoklu instance/üretim).
    /// </summary>
    public bool Enabled { get; init; }

    public string Configuration { get; init; } = "localhost:6379";
}
