using System.IdentityModel.Tokens.Jwt;
using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Auth;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Security;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.UnitTests.Auth;

/// <summary>
/// PanelAuthService senaryoları (TODO 1.9, API_CONTRACT §1 /auth/login + /auth/set-password):
/// mutlu yol login + rol claim, 5 deneme kilidi (LOGIN_LOCKED), enduser 403, pasif kullanıcı 401,
/// şifre politikası, davet token tek kullanım, rate-limit, PBKDF2 roundtrip.
/// SQLite in-memory AppDbContext + fake store'lar (AuthServiceTests deseni) +
/// MemoryDistributedCache (plock:/pinvite: sayaç ve davet kayıtları için).
/// </summary>
public sealed class PanelAuthServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string AdminEmail = "admin@a.com";
    private const string EnduserEmail = "user@a.com";
    private const string PassiveEmail = "pasif@a.com";
    private const string DuplicateEmail = "ortak@firma.com";
    private const string InvitedEmail = "davet@a.com";
    private const string Password = "Parola123";

    private static readonly Pbkdf2PasswordHasher Hasher = new();

    // PBKDF2 100k iterasyon pahalıdır; seed hash'i sınıf başına bir kez üretilir.
    private static readonly string SeedPasswordHash = Hasher.Hash(Password);

    private static readonly JwtOptions TestJwtOptions = new()
    {
        Issuer = "test",
        Audience = "test-clients",
        SigningKey = "unit-test-signing-key-0123456789abcdef-0123456789",
        AccessTokenMinutes = 15,
        RefreshTokenDays = 30,
    };

    private readonly SqliteConnection _connection;
    private readonly AppDbContext _dbContext;
    private readonly FakeRefreshTokenStore _refreshStore = new();
    private readonly CountingFakeRateLimiter _rateLimiter = new();
    private readonly MemoryDistributedCache _cache =
        new(Options.Create(new MemoryDistributedCacheOptions()));
    private readonly PanelAuthService _service;

    private readonly Guid _invitedUserId = Guid.NewGuid();

    public PanelAuthServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using (var seed = CreateContext())
        {
            seed.Database.EnsureCreated();

            seed.Tenants.AddRange(
                new Tenant { Id = TenantA, Name = "Firma A", Code = "AIGAP", Status = TenantStatus.Active },
                new Tenant { Id = TenantB, Name = "Firma B", Code = "BETA", Status = TenantStatus.Active });

            seed.Users.AddRange(
                new User
                {
                    TenantId = TenantA,
                    Phone = "5400000001",
                    Email = AdminEmail,
                    FirstName = "Banu",
                    LastName = "Yönetici",
                    Role = UserRole.CompanyAdmin,
                    PasswordHash = SeedPasswordHash,
                },
                // Şifresi olsa bile enduser PANELE GİREMEZ (403 beklenir).
                new User
                {
                    TenantId = TenantA,
                    Phone = "5400000002",
                    Email = EnduserEmail,
                    FirstName = "Son",
                    LastName = "Kullanıcı",
                    Role = UserRole.EndUser,
                    PasswordHash = SeedPasswordHash,
                },
                new User
                {
                    TenantId = TenantA,
                    Phone = "5400000003",
                    Email = PassiveEmail,
                    FirstName = "Pasif",
                    Role = UserRole.CompanyAdmin,
                    Status = EntityStatus.Passive,
                    PasswordHash = SeedPasswordHash,
                },
                // Aynı e-posta iki tenant'ta → companyCode'suz login VALIDATION_ERROR vermeli.
                new User
                {
                    TenantId = TenantA,
                    Phone = "5400000004",
                    Email = DuplicateEmail,
                    FirstName = "Çift A",
                    Role = UserRole.CompanyAdmin,
                    PasswordHash = SeedPasswordHash,
                },
                new User
                {
                    TenantId = TenantB,
                    Phone = "5400000005",
                    Email = DuplicateEmail,
                    FirstName = "Çift B",
                    Role = UserRole.CompanyAdmin,
                    PasswordHash = SeedPasswordHash,
                },
                // Davet edilmiş ama şifresini henüz belirlememiş admin (PasswordHash null).
                new User
                {
                    Id = _invitedUserId,
                    TenantId = TenantA,
                    Phone = "5400000006",
                    Email = InvitedEmail,
                    FirstName = "Davetli",
                    Role = UserRole.CompanyAdmin,
                });

            seed.SaveChanges();
        }

        _dbContext = CreateContext();
        _service = CreateService(_dbContext);
    }

    // ── (a) Mutlu yol: token + rol claim ─────────────────────────────────────

    [Fact]
    public async Task Login_happy_path_returns_tokens_with_role_and_tenant_claims()
    {
        var result = await _service.LoginAsync(new PanelLoginRequest(AdminEmail, Password));

        Assert.True(result.IsSuccess);
        var response = result.Value;
        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.Equal(15 * 60, response.ExpiresIn);
        Assert.Equal("Banu", response.User.FirstName);
        Assert.Equal("Yönetici", response.User.LastName);
        Assert.Equal(RoleNames.CompanyAdmin, response.User.Role);

        // Access token claim'leri: rol company_admin + tenant_id doğru tenant.
        var token = new JwtSecurityTokenHandler().ReadJwtToken(response.AccessToken);
        Assert.Equal(RoleNames.CompanyAdmin, token.Claims.Single(c => c.Type == AppClaimTypes.Role).Value);
        Assert.Equal(TenantA.ToString(), token.Claims.Single(c => c.Type == AppClaimTypes.TenantId).Value);
    }

    // ── (b) 5 hatalı denemede 15 dk kilit ────────────────────────────────────

    [Fact]
    public async Task Five_wrong_passwords_lock_the_login()
    {
        var wrongRequest = new PanelLoginRequest(AdminEmail, "YanlisSifre1");

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            var failed = await _service.LoginAsync(wrongRequest);
            Assert.Equal(ErrorCodes.Unauthenticated, failed.Error!.Code);
            Assert.Equal(401, failed.Error!.HttpStatus);
        }

        var fifth = await _service.LoginAsync(wrongRequest);
        Assert.Equal(ErrorCodes.LoginLocked, fifth.Error!.Code);
        Assert.Equal(423, fifth.Error!.HttpStatus);

        // Kilitliyken DOĞRU şifre bile kabul edilmez (LOGIN_LOCKED sürer).
        var withCorrectPassword = await _service.LoginAsync(new PanelLoginRequest(AdminEmail, Password));
        Assert.Equal(ErrorCodes.LoginLocked, withCorrectPassword.Error!.Code);
    }

    // ── (c) enduser panele giremez ───────────────────────────────────────────

    [Fact]
    public async Task Enduser_login_is_forbidden()
    {
        var result = await _service.LoginAsync(new PanelLoginRequest(EnduserEmail, Password));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotAuthorized, result.Error!.Code);
        Assert.Equal(403, result.Error!.HttpStatus);
    }

    // ── (d) Pasif/bilinmeyen/şifresiz kullanıcı: tek tip 401 (enumeration engeli) ─

    [Fact]
    public async Task Passive_user_login_is_unauthenticated()
    {
        var result = await _service.LoginAsync(new PanelLoginRequest(PassiveEmail, Password));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.Unauthenticated, result.Error!.Code);
        Assert.Equal(401, result.Error!.HttpStatus);
    }

    [Fact]
    public async Task Unknown_email_and_missing_password_hash_are_unauthenticated()
    {
        var unknown = await _service.LoginAsync(new PanelLoginRequest("yok@firma.com", Password));
        Assert.Equal(ErrorCodes.Unauthenticated, unknown.Error!.Code);

        // Şifresini henüz belirlememiş (PasswordHash null) kullanıcı da aynı 401'i alır.
        var noPassword = await _service.LoginAsync(new PanelLoginRequest(InvitedEmail, Password));
        Assert.Equal(ErrorCodes.Unauthenticated, noPassword.Error!.Code);
    }

    // ── (e) Çoklu-tenant e-posta: companyCode zorunlu ────────────────────────

    [Fact]
    public async Task Multi_tenant_email_requires_company_code()
    {
        var withoutCode = await _service.LoginAsync(new PanelLoginRequest(DuplicateEmail, Password));
        Assert.False(withoutCode.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, withoutCode.Error!.Code);
        Assert.Equal(400, withoutCode.Error!.HttpStatus);

        var withCode = await _service.LoginAsync(new PanelLoginRequest(DuplicateEmail, Password, "AIGAP"));
        Assert.True(withCode.IsSuccess);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(withCode.Value.AccessToken);
        Assert.Equal(TenantA.ToString(), token.Claims.Single(c => c.Type == AppClaimTypes.TenantId).Value);
    }

    // ── (f) Set-password: şifre politikası ───────────────────────────────────

    [Fact]
    public async Task Set_password_rejects_policy_violations()
    {
        var inviteToken = await _service.CreateInviteAsync(_invitedUserId);

        // Politika: min 8 + en az bir harf + bir rakam.
        foreach (var weakPassword in new[] { "kisa1", "yalnizharfler", "12345678" })
        {
            var result = await _service.SetPasswordAsync(new SetPasswordRequest(inviteToken, weakPassword));

            Assert.False(result.IsSuccess);
            Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
            Assert.Equal(400, result.Error!.HttpStatus);
        }

        // Politika ihlali daveti TÜKETMEZ: geçerli şifreyle aynı token hâlâ çalışır.
        var valid = await _service.SetPasswordAsync(new SetPasswordRequest(inviteToken, "Gecerli123"));
        Assert.True(valid.IsSuccess);
    }

    // ── (g) Davet token tek kullanımlık; şifre sonrası login açılır ──────────

    [Fact]
    public async Task Invite_token_is_single_use_and_enables_login()
    {
        var inviteToken = await _service.CreateInviteAsync(_invitedUserId);

        // Şifre belirlenmeden login yapılamaz (PasswordHash null → 401).
        var before = await _service.LoginAsync(new PanelLoginRequest(InvitedEmail, "Yeni1234"));
        Assert.Equal(ErrorCodes.Unauthenticated, before.Error!.Code);

        var set = await _service.SetPasswordAsync(new SetPasswordRequest(inviteToken, "Yeni1234"));
        Assert.True(set.IsSuccess);

        // Yeni şifreyle giriş artık başarılı.
        var after = await _service.LoginAsync(new PanelLoginRequest(InvitedEmail, "Yeni1234"));
        Assert.True(after.IsSuccess);
        Assert.Equal(RoleNames.CompanyAdmin, after.Value.User.Role);

        // AYNI token ikinci kez kullanılamaz (tek kullanımlık) → NOT_FOUND.
        var reuse = await _service.SetPasswordAsync(new SetPasswordRequest(inviteToken, "Baska1234"));
        Assert.False(reuse.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, reuse.Error!.Code);
        Assert.Equal(404, reuse.Error!.HttpStatus);
    }

    // ── (h) Rate-limit: e-posta başına 10/dk ─────────────────────────────────

    [Fact]
    public async Task Eleventh_attempt_within_window_is_rate_limited()
    {
        var wrongRequest = new PanelLoginRequest(AdminEmail, "YanlisSifre1");

        // İlk 10 deneme pencere içinde işlenir (401'ler, 5.'ten itibaren LOGIN_LOCKED).
        for (var attempt = 1; attempt <= 10; attempt++)
        {
            var result = await _service.LoginAsync(wrongRequest);
            Assert.False(result.IsSuccess);
            Assert.NotEqual(ErrorCodes.RateLimited, result.Error!.Code);
        }

        var eleventh = await _service.LoginAsync(wrongRequest);
        Assert.Equal(ErrorCodes.RateLimited, eleventh.Error!.Code);
        Assert.Equal(429, eleventh.Error!.HttpStatus);
    }

    // ── (i) Pbkdf2PasswordHasher: roundtrip + biçim + salt ───────────────────

    [Fact]
    public void Pbkdf2_roundtrip_verifies_correct_password_and_rejects_wrong()
    {
        var hash = Hasher.Hash("Dogru1234");

        Assert.True(Hasher.Verify("Dogru1234", hash));
        Assert.False(Hasher.Verify("Yanlis1234", hash));
        Assert.False(Hasher.Verify("Dogru1234", "bozuk-bicim"));

        // Biçim: pbkdf2$<iter>$<saltB64>$<hashB64> (16B salt, 32B hash).
        var parts = hash.Split('$');
        Assert.Equal(4, parts.Length);
        Assert.Equal("pbkdf2", parts[0]);
        Assert.Equal("100000", parts[1]);
        Assert.Equal(16, Convert.FromBase64String(parts[2]).Length);
        Assert.Equal(32, Convert.FromBase64String(parts[3]).Length);
    }

    [Fact]
    public void Pbkdf2_uses_fresh_salt_per_hash()
    {
        var first = Hasher.Hash("AyniSifre1");
        var second = Hasher.Hash("AyniSifre1");

        // Aynı şifre iki kez hash'lenince salt farklı olduğundan çıktılar farklıdır;
        // ikisi de doğrulanır (rainbow table / hash karşılaştırma sızıntısı engeli).
        Assert.NotEqual(first, second);
        Assert.True(Hasher.Verify("AyniSifre1", first));
        Assert.True(Hasher.Verify("AyniSifre1", second));
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private PanelAuthService CreateService(AppDbContext dbContext) => new(
        dbContext,
        new JwtTokenService(Options.Create(TestJwtOptions)),
        _refreshStore,
        _rateLimiter,
        Hasher,
        _cache,
        Options.Create(TestJwtOptions));

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        // Anonim bağlam: login öncesi tenant claim'i yoktur (PanelAuthService IgnoreQueryFilters kullanır).
        return new AppDbContext(options, new AnonymousTenantContext());
    }

    public void Dispose()
    {
        _dbContext.Dispose();
        _connection.Dispose();
    }

    private sealed class AnonymousTenantContext : ITenantContext
    {
        public Guid? TenantId => null;
        public Guid? UserId => null;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId =>
            throw new InvalidOperationException("Tenant bağlamı yok.");
    }

    private sealed class FakeRefreshTokenStore : IRefreshTokenStore
    {
        private readonly Dictionary<string, Guid> _tokens = new();

        public Task StoreAsync(string tokenHash, Guid userId, TimeSpan ttl, CancellationToken cancellationToken = default)
        {
            _tokens[tokenHash] = userId;
            return Task.CompletedTask;
        }

        public Task<Guid?> TakeAsync(string tokenHash, CancellationToken cancellationToken = default)
        {
            if (!_tokens.TryGetValue(tokenHash, out var userId))
            {
                return Task.FromResult<Guid?>(null);
            }

            _tokens.Remove(tokenHash);
            return Task.FromResult<Guid?>(userId);
        }
    }

    /// <summary>Sayaçlı fake: pencere süresi test boyunca dolmaz, yalnızca maxCount sınırı uygulanır.</summary>
    private sealed class CountingFakeRateLimiter : IRateLimiter
    {
        private readonly Dictionary<string, int> _counts = new();

        public Task<bool> TryAcquireAsync(string key, TimeSpan window, CancellationToken cancellationToken = default) =>
            TryAcquireAsync(key, window, maxCount: 1, cancellationToken);

        public Task<bool> TryAcquireAsync(
            string key, TimeSpan window, int maxCount, CancellationToken cancellationToken = default)
        {
            var current = _counts.GetValueOrDefault(key);
            if (current >= maxCount)
            {
                return Task.FromResult(false);
            }

            _counts[key] = current + 1;
            return Task.FromResult(true);
        }
    }
}
