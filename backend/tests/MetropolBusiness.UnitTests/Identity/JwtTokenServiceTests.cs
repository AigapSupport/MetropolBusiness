using System.IdentityModel.Tokens.Jwt;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Identity;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.UnitTests.Identity;

public class JwtTokenServiceTests
{
    private static JwtTokenService CreateService() => new(Options.Create(new JwtOptions
    {
        Issuer = "metropolbusiness-test",
        Audience = "test-clients",
        SigningKey = new string('k', 64),
        AccessTokenMinutes = 15,
    }));

    [Fact]
    public void Access_token_contains_sub_tenant_role_and_member_claims()
    {
        var tenantId = Guid.NewGuid();
        var user = new User
        {
            TenantId = tenantId,
            Role = UserRole.CompanyAdmin,
            MemberId = "3299",
            Phone = "5550000001",
        };

        var pair = CreateService().CreateTokens(user);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(pair.AccessToken);

        Assert.Equal(user.Id.ToString(), token.Claims.Single(c => c.Type == AppClaimTypes.Subject).Value);
        Assert.Equal(tenantId.ToString(), token.Claims.Single(c => c.Type == AppClaimTypes.TenantId).Value);
        Assert.Equal(RoleNames.CompanyAdmin, token.Claims.Single(c => c.Type == AppClaimTypes.Role).Value);
        Assert.Equal("3299", token.Claims.Single(c => c.Type == AppClaimTypes.MemberId).Value);
        Assert.Equal(15 * 60, pair.ExpiresInSeconds);
    }

    [Fact]
    public void Platform_admin_token_has_no_tenant_claim()
    {
        var user = new User { Role = UserRole.PlatformAdmin, Phone = "5550000000" };

        var pair = CreateService().CreateTokens(user);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(pair.AccessToken);

        Assert.DoesNotContain(token.Claims, c => c.Type == AppClaimTypes.TenantId);
        Assert.Equal("true", token.Claims.Single(c => c.Type == AppClaimTypes.PlatformAdmin).Value);
    }

    [Fact]
    public void Refresh_tokens_are_opaque_and_unique()
    {
        var user = new User { TenantId = Guid.NewGuid(), Phone = "5550000001" };
        var service = CreateService();

        var first = service.CreateTokens(user);
        var second = service.CreateTokens(user);

        Assert.False(string.IsNullOrWhiteSpace(first.RefreshToken));
        Assert.NotEqual(first.RefreshToken, second.RefreshToken);
    }
}
