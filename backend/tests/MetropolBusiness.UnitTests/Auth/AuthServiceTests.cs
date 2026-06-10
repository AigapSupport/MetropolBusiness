using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Auth;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.UnitTests.Auth;

/// <summary>
/// AuthService senaryoları (TODO 1.2, API_CONTRACT §1): OTP gönder/doğrula, 3 deneme kilidi,
/// resend rate-limit, refresh rotasyonu, logout, pasif/silinmiş kullanıcı, çoklu-tenant telefon.
/// SQLite in-memory AppDbContext (TenantIsolationTests deseni) + dictionary tabanlı fake store'lar.
/// </summary>
public sealed class AuthServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string NewUserPhone = "5340000001";
    private const string ExistingUserPhone = "5340000002";
    private const string PassiveUserPhone = "5340000003";
    private const string DeletedUserPhone = "5340000004";
    private const string DuplicatePhone = "5340000005";

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
    private readonly FakeOtpStore _otpStore = new();
    private readonly FakeRefreshTokenStore _refreshStore = new();
    private readonly FakeRateLimiter _rateLimiter = new();
    private readonly RecordingSmsSender _smsSender = new();
    private readonly AuthService _service;

    public AuthServiceTests()
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
                // FirstName boş → isNewUser=true beklenir.
                new User { TenantId = TenantA, Phone = NewUserPhone },
                new User { TenantId = TenantA, Phone = ExistingUserPhone, FirstName = "Ayşe", LastName = "Yılmaz" },
                new User { TenantId = TenantA, Phone = PassiveUserPhone, FirstName = "Pasif", Status = EntityStatus.Passive },
                new User
                {
                    TenantId = TenantA,
                    Phone = DeletedUserPhone,
                    FirstName = "Silinmiş",
                    DeletedAt = DateTimeOffset.UtcNow,
                },
                // Aynı telefon iki farklı tenant'ta → companyCode'suz send VALIDATION_ERROR vermeli.
                new User { TenantId = TenantA, Phone = DuplicatePhone, FirstName = "Çift A" },
                new User { TenantId = TenantB, Phone = DuplicatePhone, FirstName = "Çift B" });

            seed.SaveChanges();
        }

        _dbContext = CreateContext();
        _service = CreateService(_dbContext);
    }

    // ── (a) Mutlu yol ────────────────────────────────────────────────────────

    [Fact]
    public async Task Send_then_verify_happy_path_returns_tokens()
    {
        var send = await _service.SendOtpAsync(new OtpSendRequest(ExistingUserPhone));

        Assert.True(send.IsSuccess);
        Assert.NotEmpty(send.Value.OtpRef);
        Assert.Equal(180, send.Value.ExpiresInSeconds);
        Assert.Equal(60, send.Value.ResendInSeconds);

        var sent = Assert.Single(_smsSender.Sent);
        Assert.Equal(ExistingUserPhone, sent.Phone);
        Assert.Matches("^[0-9]{6}$", sent.Code);

        var verify = await _service.VerifyOtpAsync(
            new OtpVerifyRequest(send.Value.OtpRef, sent.Code, ExistingUserPhone));

        Assert.True(verify.IsSuccess);
        var response = verify.Value;
        Assert.NotEmpty(response.AccessToken);
        Assert.NotEmpty(response.RefreshToken);
        Assert.Equal(15 * 60, response.ExpiresIn);
        Assert.False(response.IsNewUser);
        Assert.Equal("Ayşe", response.User.FirstName);
        Assert.Equal("Yılmaz", response.User.LastName);
    }

    [Fact]
    public async Task Verify_marks_new_user_when_first_name_empty()
    {
        var login = await LoginAsync(NewUserPhone);

        Assert.True(login.IsNewUser);
        Assert.Null(login.User.FirstName);
    }

    // ── (b) 3 deneme kilidi ──────────────────────────────────────────────────

    [Fact]
    public async Task Three_wrong_codes_lock_the_otp()
    {
        var send = await _service.SendOtpAsync(new OtpSendRequest(ExistingUserPhone));
        var otpRef = send.Value.OtpRef;
        var realCode = _smsSender.LastCode!;
        var wrongCode = realCode == "111111" ? "222222" : "111111";
        var wrongRequest = new OtpVerifyRequest(otpRef, wrongCode, ExistingUserPhone);

        var first = await _service.VerifyOtpAsync(wrongRequest);
        Assert.Equal(ErrorCodes.OtpInvalid, first.Error!.Code);
        Assert.Equal(400, first.Error!.HttpStatus);

        var second = await _service.VerifyOtpAsync(wrongRequest);
        Assert.Equal(ErrorCodes.OtpInvalid, second.Error!.Code);

        var third = await _service.VerifyOtpAsync(wrongRequest);
        Assert.Equal(ErrorCodes.OtpLocked, third.Error!.Code);
        Assert.Equal(423, third.Error!.HttpStatus);

        // Kilitlendikten sonra DOĞRU kod bile kabul edilmez.
        var withCorrectCode = await _service.VerifyOtpAsync(
            new OtpVerifyRequest(otpRef, realCode, ExistingUserPhone));
        Assert.Equal(ErrorCodes.OtpLocked, withCorrectCode.Error!.Code);
    }

    // ── (c) Resend rate-limit ────────────────────────────────────────────────

    [Fact]
    public async Task Second_send_within_resend_window_is_rate_limited()
    {
        var first = await _service.SendOtpAsync(new OtpSendRequest(ExistingUserPhone));
        Assert.True(first.IsSuccess);

        var second = await _service.SendOtpAsync(new OtpSendRequest(ExistingUserPhone));

        Assert.False(second.IsSuccess);
        Assert.Equal(ErrorCodes.OtpRateLimit, second.Error!.Code);
        Assert.Equal(429, second.Error!.HttpStatus);
    }

    // ── (d) Refresh rotasyonu ────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_rotates_and_old_token_becomes_invalid()
    {
        var login = await LoginAsync(ExistingUserPhone);

        var firstRefresh = await _service.RefreshAsync(new RefreshRequest(login.RefreshToken));
        Assert.True(firstRefresh.IsSuccess);
        Assert.NotEqual(login.RefreshToken, firstRefresh.Value.RefreshToken);

        // AYNI eski token ikinci kez → REFRESH_INVALID (rotasyon: ilk kullanımda tüketildi).
        var replay = await _service.RefreshAsync(new RefreshRequest(login.RefreshToken));
        Assert.False(replay.IsSuccess);
        Assert.Equal(ErrorCodes.RefreshInvalid, replay.Error!.Code);
        Assert.Equal(401, replay.Error!.HttpStatus);

        // Rotasyonla verilen yeni refresh çalışmaya devam eder.
        var secondRefresh = await _service.RefreshAsync(new RefreshRequest(firstRefresh.Value.RefreshToken));
        Assert.True(secondRefresh.IsSuccess);
    }

    // ── (e) Logout ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_after_logout_is_invalid()
    {
        var login = await LoginAsync(ExistingUserPhone);

        await _service.LogoutAsync(new LogoutRequest(login.RefreshToken));

        var refresh = await _service.RefreshAsync(new RefreshRequest(login.RefreshToken));
        Assert.False(refresh.IsSuccess);
        Assert.Equal(ErrorCodes.RefreshInvalid, refresh.Error!.Code);
    }

    // ── (f) Pasif/silinmiş kullanıcı ────────────────────────────────────────

    [Fact]
    public async Task Send_for_passive_user_returns_not_found()
    {
        var result = await _service.SendOtpAsync(new OtpSendRequest(PassiveUserPhone));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
        Assert.Equal(404, result.Error!.HttpStatus);
    }

    [Fact]
    public async Task Send_for_soft_deleted_user_returns_not_found()
    {
        var result = await _service.SendOtpAsync(new OtpSendRequest(DeletedUserPhone));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
    }

    // ── (g) Çoklu-tenant telefon ─────────────────────────────────────────────

    [Fact]
    public async Task Send_without_company_code_for_multi_tenant_phone_requires_company_code()
    {
        var result = await _service.SendOtpAsync(new OtpSendRequest(DuplicatePhone));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
        Assert.Equal(400, result.Error!.HttpStatus);
    }

    [Fact]
    public async Task Send_with_company_code_resolves_multi_tenant_phone()
    {
        var result = await _service.SendOtpAsync(new OtpSendRequest(DuplicatePhone, "AIGAP"));

        Assert.True(result.IsSuccess);
        var sent = Assert.Single(_smsSender.Sent);
        Assert.Equal(DuplicatePhone, sent.Phone);
    }

    // ── Diğer kurallar ───────────────────────────────────────────────────────

    [Fact]
    public async Task Send_with_invalid_phone_returns_validation_error()
    {
        var result = await _service.SendOtpAsync(new OtpSendRequest("123"));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
    }

    [Fact]
    public async Task Dev_fixed_otp_overrides_random_code()
    {
        var service = CreateService(_dbContext, new AuthOptions { DevFixedOtp = "123456" });

        var send = await service.SendOtpAsync(new OtpSendRequest(ExistingUserPhone));
        Assert.True(send.IsSuccess);

        var verify = await service.VerifyOtpAsync(
            new OtpVerifyRequest(send.Value.OtpRef, "123456", ExistingUserPhone));
        Assert.True(verify.IsSuccess);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private async Task<OtpVerifyResponse> LoginAsync(string phone)
    {
        var send = await _service.SendOtpAsync(new OtpSendRequest(phone));
        Assert.True(send.IsSuccess);

        var verify = await _service.VerifyOtpAsync(
            new OtpVerifyRequest(send.Value.OtpRef, _smsSender.LastCode!, phone));
        Assert.True(verify.IsSuccess);

        return verify.Value;
    }

    private AuthService CreateService(AppDbContext dbContext, AuthOptions? authOptions = null) =>
        new(
            dbContext,
            new JwtTokenService(Options.Create(TestJwtOptions)),
            _otpStore,
            _refreshStore,
            _rateLimiter,
            _smsSender,
            Options.Create(authOptions ?? new AuthOptions()),
            Options.Create(TestJwtOptions));

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        // Anonim bağlam: login öncesi tenant claim'i yoktur (AuthService IgnoreQueryFilters kullanır).
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

    private sealed class FakeOtpStore : IOtpStore
    {
        private readonly Dictionary<string, OtpEntry> _entries = new();

        public Task StoreAsync(string otpRef, OtpEntry entry, TimeSpan ttl, CancellationToken cancellationToken = default)
        {
            _entries[otpRef] = entry;
            return Task.CompletedTask;
        }

        public Task<OtpEntry?> GetAsync(string otpRef, CancellationToken cancellationToken = default) =>
            Task.FromResult(_entries.TryGetValue(otpRef, out var entry) ? entry : (OtpEntry?)null);

        public Task<int> IncrementAttemptsAsync(string otpRef, CancellationToken cancellationToken = default)
        {
            if (!_entries.TryGetValue(otpRef, out var entry))
            {
                return Task.FromResult(0);
            }

            var updated = entry with { Attempts = entry.Attempts + 1 };
            _entries[otpRef] = updated;
            return Task.FromResult(updated.Attempts);
        }

        public Task RemoveAsync(string otpRef, CancellationToken cancellationToken = default)
        {
            _entries.Remove(otpRef);
            return Task.CompletedTask;
        }
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

    private sealed class FakeRateLimiter : IRateLimiter
    {
        private readonly Dictionary<string, DateTimeOffset> _windows = new();

        public Task<bool> TryAcquireAsync(string key, TimeSpan window, CancellationToken cancellationToken = default)
        {
            var now = DateTimeOffset.UtcNow;
            if (_windows.TryGetValue(key, out var blockedUntil) && blockedUntil > now)
            {
                return Task.FromResult(false);
            }

            _windows[key] = now.Add(window);
            return Task.FromResult(true);
        }

        // Sayaçlı sürüm panel login içindir; OTP senaryoları kullanmaz (PanelAuthServiceTests'te ayrı fake).
        public Task<bool> TryAcquireAsync(
            string key, TimeSpan window, int maxCount, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException("Bu testlerde sayaçlı rate-limit kullanılmaz.");
    }

    private sealed class RecordingSmsSender : ISmsSender
    {
        public List<(string Phone, string Code)> Sent { get; } = [];

        public string? LastCode => Sent.Count == 0 ? null : Sent[^1].Code;

        public Task SendOtpAsync(string phone, string code, CancellationToken cancellationToken = default)
        {
            Sent.Add((phone, code));
            return Task.CompletedTask;
        }
    }
}
