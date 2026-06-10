using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace MetropolBusiness.Infrastructure.Identity;

/// <summary>
/// JWT üretimi (ARCHITECTURE §6). Access token: sub, tenant_id, role, member_id claim'leri.
/// Refresh token opak rastgele değerdir; saklama + rotasyon doğrulaması Faz 1.2'de eklenecek.
/// </summary>
public sealed class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _options = options.Value;

    public TokenPair CreateTokens(User user)
    {
        var expiresIn = TimeSpan.FromMinutes(_options.AccessTokenMinutes);
        var now = DateTimeOffset.UtcNow;

        var claims = new List<Claim>
        {
            new(AppClaimTypes.Subject, user.Id.ToString()),
            new(AppClaimTypes.Role, ToRoleName(user.Role)),
        };

        if (user.Role == UserRole.PlatformAdmin)
        {
            // Platform admin tenant-üstüdür: tenant_id claim'i taşımaz (ARCHITECTURE §3.2).
            claims.Add(new Claim(AppClaimTypes.PlatformAdmin, "true"));
        }
        else
        {
            claims.Add(new Claim(AppClaimTypes.TenantId, user.TenantId.ToString()));
        }

        if (!string.IsNullOrEmpty(user.MemberId))
        {
            claims.Add(new Claim(AppClaimTypes.MemberId, user.MemberId));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: now.Add(expiresIn).UtcDateTime,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        var refreshToken = GenerateOpaqueToken();

        return new TokenPair(accessToken, refreshToken, (int)expiresIn.TotalSeconds);
    }

    private static string GenerateOpaqueToken()
    {
        Span<byte> bytes = stackalloc byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static string ToRoleName(UserRole role) => role switch
    {
        UserRole.EndUser => RoleNames.EndUser,
        UserRole.CompanyAdmin => RoleNames.CompanyAdmin,
        UserRole.Approver => RoleNames.Approver,
        UserRole.PlatformAdmin => RoleNames.PlatformAdmin,
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, null),
    };
}
