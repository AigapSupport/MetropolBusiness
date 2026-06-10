namespace MetropolBusiness.Infrastructure.Identity;

/// <summary>
/// JWT ayarları (ARCHITECTURE §6): access kısa ömür + refresh rotasyonlu.
/// SigningKey SIRDIR: environment/secret store'dan gelir, repoya yazılmaz.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;
    public string SigningKey { get; init; } = string.Empty;
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 30;
}
