namespace MetropolBusiness.Integration.Metropol;

/// <summary>
/// Metropol entegrasyon ayarları. AccessKey / AesKey / ConsumerId SIRDIR:
/// yalnızca environment/secret store'dan gelir; log'a, response'a, istemciye gitmez (CLAUDE.md kural 2).
/// İki ayrı base URL vardır: auth (token) ve api (CLAUDE.md §6).
/// </summary>
public sealed class MetropolOptions
{
    public const string SectionName = "Metropol";

    /// <summary>Token servisi base URL'i (test: testauth.metropolodeme.com).</summary>
    public string AuthBaseUrl { get; init; } = string.Empty;

    /// <summary>API base URL'i (test: testapi.metropolcard.com).</summary>
    public string ApiBaseUrl { get; init; } = string.Empty;

    public string AccessKey { get; init; } = string.Empty;
    public string AesKey { get; init; } = string.Empty;
    public string ConsumerId { get; init; } = string.Empty;

    /// <summary>Token 5 dk geçerli; bu saniye eşiğinde yenilenir (ARCHITECTURE §5.1: ~4 dk).</summary>
    public int TokenRefreshThresholdSeconds { get; init; } = 240;
}
