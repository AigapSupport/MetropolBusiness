using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.Infrastructure.Auth;

/// <summary>
/// Panel girişi: e-posta+şifre (TODO 1.9, PANELS_SPEC §0.4 kararı — LESSONS.md 'Panel girişi').
/// IPanelAuthService implementasyonu Infrastructure'dadır çünkü AppDbContext gerektirir
/// (AuthService ile aynı desen). Şifre, davet token'ı ve token değerleri HİÇBİR log'a
/// yazılmaz (CLAUDE.md kural 4).
/// </summary>
public sealed class PanelAuthService(
    AppDbContext dbContext,
    IJwtTokenService jwtTokenService,
    IRefreshTokenStore refreshTokenStore,
    IRateLimiter rateLimiter,
    IPasswordHasher passwordHasher,
    IDistributedCache cache,
    IOptions<JwtOptions> jwtOptions) : IPanelAuthService
{
    /// <summary>Başarısız giriş sayacı cache öneki (anahtar: plock:&lt;userId&gt;).</summary>
    private const string LockKeyPrefix = "plock:";

    /// <summary>Davet kaydı cache öneki (anahtar: pinvite:&lt;SHA256(token)&gt; → userId).</summary>
    private const string InviteKeyPrefix = "pinvite:";

    /// <summary>5 başarısız denemede kilit (LOGIN_LOCKED 423).</summary>
    private const int MaxFailedAttempts = 5;

    /// <summary>Rate-limit: e-posta başına dakikada 10 giriş denemesi.</summary>
    private const int LoginAttemptsPerWindow = 10;

    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan LoginRateWindow = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan InviteTtl = TimeSpan.FromHours(72);

    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    // Kullanıcıya gösterilebilir Türkçe mesajlar (API_CONTRACT §0.2 + §14).
    // Bilinmeyen e-posta / yanlış şifre / şifresiz (panel-dışı) hesap AYNI 401 mesajını alır:
    // hangi e-postanın kayıtlı olduğu sızdırılmaz (enumeration engeli).
    private static readonly Error InvalidCredentialsError = new(
        ErrorCodes.Unauthenticated,
        "E-posta veya şifre hatalı.",
        401);

    private static readonly Error PanelRoleRequiredError = new(
        ErrorCodes.NotAuthorized,
        "Bu hesapla panel girişi yapılamaz. Lütfen mobil uygulamayı kullanın.",
        403);

    private static readonly Error LoginLockedError = new(
        ErrorCodes.LoginLocked,
        "Çok fazla hatalı giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.",
        423);

    private static readonly Error LoginRateLimitedError = new(
        ErrorCodes.RateLimited,
        "Çok fazla giriş denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.",
        429);

    private static readonly Error CompanyCodeRequiredError = new(
        ErrorCodes.ValidationError,
        "Bu e-posta birden fazla firmada kayıtlı. Lütfen firma kodunuzla birlikte giriş yapın.",
        400,
        new { field = "companyCode" });

    private static readonly Error InviteInvalidError = new(
        ErrorCodes.NotFound,
        "Davet bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış.",
        404);

    private static readonly Error PasswordPolicyError = new(
        ErrorCodes.ValidationError,
        "Şifre en az 8 karakter olmalı ve en az bir harf ile bir rakam içermelidir.",
        400,
        new { field = "newPassword" });

    public async Task<Result<PanelLoginResponse>> LoginAsync(
        PanelLoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = (request.Email ?? string.Empty).Trim();
        var password = request.Password ?? string.Empty;

        if (email.Length == 0 || !email.Contains('@') || password.Length == 0)
        {
            return Result<PanelLoginResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "E-posta ve şifre zorunludur.",
                400,
                new { fields = new[] { "email", "password" } }));
        }

        // Rate-limit: e-posta başına 10/dk (CLAUDE.md §8 login uçlarında rate-limit).
        var normalizedEmail = email.ToLowerInvariant();
        if (!await rateLimiter.TryAcquireAsync(
                $"panel:login:{normalizedEmail}", LoginRateWindow, LoginAttemptsPerWindow, cancellationToken))
        {
            return Result<PanelLoginResponse>.Fail(LoginRateLimitedError);
        }

        var userResult = await FindPanelUserAsync(normalizedEmail, request.CompanyCode, cancellationToken);
        if (!userResult.IsSuccess)
        {
            return Result<PanelLoginResponse>.Fail(userResult.Error!);
        }

        var user = userResult.Value;

        // enduser panele giremez (PANELS_SPEC §0.4: yanlış rol ile girişte erişim reddi).
        if (user.Role is not (UserRole.CompanyAdmin or UserRole.Approver or UserRole.PlatformAdmin))
        {
            return Result<PanelLoginResponse>.Fail(PanelRoleRequiredError);
        }

        // Kilit kontrolü ŞİFREDEN ÖNCE: kilitliyken doğru şifre bile kabul edilmez.
        var lockKey = LockKeyPrefix + user.Id;
        var failedAttempts = await ReadFailedAttemptsAsync(lockKey, cancellationToken);
        if (failedAttempts >= MaxFailedAttempts)
        {
            return Result<PanelLoginResponse>.Fail(LoginLockedError);
        }

        if (!passwordHasher.Verify(password, user.PasswordHash!))
        {
            // Her hatalı denemede sayaç artar ve 15 dk pencere yeniden başlar
            // (pencere kayar — kabul edilen basitleştirme, deneme sürdükçe kilit uzar).
            failedAttempts++;
            await cache.SetStringAsync(
                lockKey,
                failedAttempts.ToString(CultureInfo.InvariantCulture),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = LockDuration },
                cancellationToken);

            return failedAttempts >= MaxFailedAttempts
                ? Result<PanelLoginResponse>.Fail(LoginLockedError)
                : Result<PanelLoginResponse>.Fail(InvalidCredentialsError);
        }

        // Başarılı giriş sayaç penceresini sıfırlar.
        await cache.RemoveAsync(lockKey, cancellationToken);

        var tokens = await IssueTokensAsync(user, cancellationToken);

        return Result<PanelLoginResponse>.Ok(new PanelLoginResponse(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.ExpiresInSeconds,
            new PanelUserDto(
                user.Id,
                user.FirstName,
                user.LastName,
                EnumConverters.UserRoleToDb(user.Role))));
    }

    public async Task<Result<bool>> SetPasswordAsync(
        SetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var token = (request.InviteToken ?? string.Empty).Trim();
        if (token.Length == 0)
        {
            return Result<bool>.Fail(InviteInvalidError);
        }

        // Şifre politikası: min 8, en az bir harf + bir rakam (PANELS_SPEC §0.4).
        var newPassword = request.NewPassword ?? string.Empty;
        if (!IsPasswordValid(newPassword))
        {
            return Result<bool>.Fail(PasswordPolicyError);
        }

        // Davet cache'te HASH anahtarıyla durur (ham token saklanmaz — refresh/OTP deseni).
        var inviteKey = InviteKeyPrefix + Sha256(token);
        var storedUserId = await cache.GetStringAsync(inviteKey, cancellationToken);
        if (storedUserId is null || !Guid.TryParse(storedUserId, out var userId))
        {
            return Result<bool>.Fail(InviteInvalidError);
        }

        // IgnoreQueryFilters GEREKÇESİ (ARCHITECTURE §3.3): set-password anonim uçtur,
        // tenant claim'i olmadığı için global filter tüm kullanıcıları gizler; soft-delete
        // (DeletedAt == null) + durum (Status == Active) koşulları ELLE uygulanır.
        var user = await dbContext.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                u => u.Id == userId && u.DeletedAt == null && u.Status == EntityStatus.Active,
                cancellationToken);
        if (user is null)
        {
            // Davet edilen kullanıcı pasifleştirilmiş/silinmişse davet de geçersizdir.
            return Result<bool>.Fail(InviteInvalidError);
        }

        user.PasswordHash = passwordHasher.Hash(newPassword);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Davet TEK KULLANIMLIK: şifre yazıldıktan sonra kayıt silinir.
        await cache.RemoveAsync(inviteKey, cancellationToken);

        return Result<bool>.Ok(true);
    }

    public async Task<string> CreateInviteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Opak, URL-güvenli token (64 hex karakter = 32 bayt entropi).
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

        // Cache'e ham token DEĞİL hash'i yazılır; ham değer yalnızca çağırana döner
        // ve hiçbir log'a yazılmaz (CLAUDE.md kural 4).
        await cache.SetStringAsync(
            InviteKeyPrefix + Sha256(token),
            userId.ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = InviteTtl },
            cancellationToken);

        return token;
    }

    /// <summary>
    /// Login öncesi panel kullanıcısı bulma. DİKKAT — anonim bağlamda tenant claim'i
    /// olmadığı için global query filter TÜM kullanıcıları gizler; filtre burada AÇIK
    /// GEREKÇEYLE IgnoreQueryFilters ile aşılır (ARCHITECTURE §3.3) ve soft-delete
    /// (DeletedAt == null) + durum (Status == Active) + şifre tanımlı (PasswordHash != null,
    /// yalnız panel kullanıcıları) koşulları ELLE uygulanır (AuthService ile aynı desen).
    /// </summary>
    private async Task<Result<User>> FindPanelUserAsync(
        string normalizedEmail, string? companyCode, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(companyCode))
        {
            var code = companyCode.Trim();

            // Tenant entity'sinde query filter yok; aktif firma koşulu açıkça uygulanır.
            var tenant = await dbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    t => t.Code == code && t.Status == TenantStatus.Active, cancellationToken);
            if (tenant is null)
            {
                return Result<User>.Fail(InvalidCredentialsError);
            }

            var user = await dbContext.Users
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.TenantId == tenant.Id
                        && u.Email != null && u.Email.ToLower() == normalizedEmail
                        && u.DeletedAt == null
                        && u.Status == EntityStatus.Active
                        && u.PasswordHash != null,
                    cancellationToken);

            return user is null ? Result<User>.Fail(InvalidCredentialsError) : Result<User>.Ok(user);
        }

        // Firma kodu verilmediyse e-posta TÜM tenant'larda aranır (OTP akışındaki fallback kuralı).
        var matches = await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.Email != null && u.Email.ToLower() == normalizedEmail
                && u.DeletedAt == null
                && u.Status == EntityStatus.Active
                && u.PasswordHash != null)
            .Take(2) // birden fazla eşleşme tespiti için 2 kayıt yeterli
            .ToListAsync(cancellationToken);

        return matches.Count switch
        {
            0 => Result<User>.Fail(InvalidCredentialsError),
            1 => Result<User>.Ok(matches[0]),
            _ => Result<User>.Fail(CompanyCodeRequiredError),
        };
    }

    private async Task<int> ReadFailedAttemptsAsync(string lockKey, CancellationToken cancellationToken)
    {
        var raw = await cache.GetStringAsync(lockKey, cancellationToken);
        return raw is not null
            && int.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var count)
            ? count
            : 0;
    }

    /// <summary>Token çifti üretir ve refresh'in SHA256 hash'ini store'a bağlar (AuthService deseni).</summary>
    private async Task<TokenPair> IssueTokensAsync(User user, CancellationToken cancellationToken)
    {
        var tokens = jwtTokenService.CreateTokens(user);
        await refreshTokenStore.StoreAsync(
            Sha256(tokens.RefreshToken),
            user.Id,
            TimeSpan.FromDays(_jwtOptions.RefreshTokenDays),
            cancellationToken);
        return tokens;
    }

    /// <summary>Politika: en az 8 karakter, en az bir harf + bir rakam (PANELS_SPEC §0.4).</summary>
    private static bool IsPasswordValid(string password) =>
        password.Length >= 8 && password.Any(char.IsLetter) && password.Any(char.IsDigit);

    private static string Sha256(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
