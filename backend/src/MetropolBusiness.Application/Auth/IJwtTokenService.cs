using MetropolBusiness.Domain.Entities;

namespace MetropolBusiness.Application.Auth;

/// <summary>Üretilen token çifti. Refresh opak ve rotasyonludur (ARCHITECTURE §6).</summary>
public sealed record TokenPair(
    string AccessToken,
    string RefreshToken,
    int ExpiresInSeconds);

/// <summary>
/// JWT üretimi (ARCHITECTURE §6). Access token claim'leri: sub, tenant_id, role, member_id.
/// Refresh token saklama/rotasyon doğrulaması Faz 1.2'de (Redis) eklenecek.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>Tenant kullanıcısı için token çifti üretir.</summary>
    TokenPair CreateTokens(User user);
}
