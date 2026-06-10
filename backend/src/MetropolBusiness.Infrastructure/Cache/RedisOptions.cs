namespace MetropolBusiness.Infrastructure.Cache;

/// <summary>Redis bağlantı ayarları (Metropol token cache, OTP, rate-limit — ARCHITECTURE §9).</summary>
public sealed class RedisOptions
{
    public const string SectionName = "Redis";

    public string Configuration { get; init; } = "localhost:6379";
}
