using System.Security.Cryptography;
using System.Text;
using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.Infrastructure.Auth;

/// <summary>
/// OTP login + refresh rotasyonu (TODO 1.2, API_CONTRACT §1).
/// IAuthService implementasyonu Infrastructure'dadır çünkü AppDbContext gerektirir;
/// Application katmanı Infrastructure'a bağımlı olamaz (CLAUDE.md §4 katman yönü,
/// JwtTokenService ile aynı desen).
/// OTP kodu, telefon ve token değerleri HİÇBİR log'a yazılmaz (CLAUDE.md kural 4).
/// </summary>
public sealed class AuthService(
    AppDbContext dbContext,
    IJwtTokenService jwtTokenService,
    IOtpStore otpStore,
    IRefreshTokenStore refreshTokenStore,
    IRateLimiter rateLimiter,
    ISmsSender smsSender,
    IOptions<AuthOptions> authOptions,
    IOptions<JwtOptions> jwtOptions) : IAuthService
{
    private readonly AuthOptions _authOptions = authOptions.Value;
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    // Kullanıcıya gösterilebilir Türkçe mesajlar (API_CONTRACT §0.2 + §14).
    private static readonly Error UserNotFoundError = new(
        ErrorCodes.NotFound,
        "Kayıtlı kullanıcı bulunamadı; firma yöneticinize başvurun.",
        404);

    private static readonly Error CompanyCodeRequiredError = new(
        ErrorCodes.ValidationError,
        "Bu telefon numarası birden fazla firmada kayıtlı. Lütfen firma kodunuzla birlikte giriş yapın.",
        400,
        new { field = "companyCode" });

    private static readonly Error OtpInvalidError = new(
        ErrorCodes.OtpInvalid,
        "Kod geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.",
        400);

    private static readonly Error OtpLockedError = new(
        ErrorCodes.OtpLocked,
        "Çok fazla hatalı deneme yapıldı. Lütfen yeni kod isteyin.",
        423);

    private static readonly Error RefreshInvalidError = new(
        ErrorCodes.RefreshInvalid,
        "Oturum süresi doldu. Lütfen tekrar giriş yapın.",
        401);

    public async Task<Result<OtpSendResponse>> SendOtpAsync(
        OtpSendRequest request, CancellationToken cancellationToken = default)
    {
        var phone = (request.Phone ?? string.Empty).Trim();
        if (!IsValidPhone(phone))
        {
            return Result<OtpSendResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Telefon numarası 10-11 haneli ve yalnızca rakamlardan oluşmalıdır.",
                400,
                new { field = "phone" }));
        }

        // Telefon başına resend penceresi (API_CONTRACT §1: 429 OTP_RATE_LIMIT).
        var resendWindow = TimeSpan.FromSeconds(_authOptions.ResendSeconds);
        if (!await rateLimiter.TryAcquireAsync($"otp:send:{phone}", resendWindow, cancellationToken))
        {
            return Result<OtpSendResponse>.Fail(new Error(
                ErrorCodes.OtpRateLimit,
                $"Çok fazla kod isteği yapıldı. Lütfen {_authOptions.ResendSeconds} saniye sonra tekrar deneyin.",
                429));
        }

        var userResult = await FindUserForLoginAsync(phone, request.CompanyCode, cancellationToken);
        if (!userResult.IsSuccess)
        {
            return Result<OtpSendResponse>.Fail(userResult.Error!);
        }

        var code = CreateOtpCode();
        var otpRef = Guid.NewGuid().ToString("N");

        // Düz kod saklanmaz: yalnızca SHA256 hash'i store'a yazılır (CLAUDE.md kural 4).
        var entry = new OtpEntry(Sha256(code), phone, userResult.Value.Id, Attempts: 0);
        await otpStore.StoreAsync(
            otpRef, entry, TimeSpan.FromSeconds(_authOptions.OtpTtlSeconds), cancellationToken);

        await smsSender.SendOtpAsync(phone, code, cancellationToken);

        return Result<OtpSendResponse>.Ok(new OtpSendResponse(
            otpRef, _authOptions.OtpTtlSeconds, _authOptions.ResendSeconds));
    }

    public async Task<Result<OtpVerifyResponse>> VerifyOtpAsync(
        OtpVerifyRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.OtpRef) || string.IsNullOrWhiteSpace(request.Code))
        {
            return Result<OtpVerifyResponse>.Fail(OtpInvalidError);
        }

        var entry = await otpStore.GetAsync(request.OtpRef, cancellationToken);
        if (entry is null || entry.Phone != (request.Phone ?? string.Empty).Trim())
        {
            return Result<OtpVerifyResponse>.Fail(OtpInvalidError);
        }

        if (entry.Attempts >= _authOptions.MaxAttempts)
        {
            return Result<OtpVerifyResponse>.Fail(OtpLockedError);
        }

        if (Sha256(request.Code.Trim()) != entry.CodeHash)
        {
            var attempts = await otpStore.IncrementAttemptsAsync(request.OtpRef, cancellationToken);
            return attempts >= _authOptions.MaxAttempts
                ? Result<OtpVerifyResponse>.Fail(OtpLockedError)
                : Result<OtpVerifyResponse>.Fail(OtpInvalidError);
        }

        // Doğru kod: tek kullanımlıktır, kayıt hemen silinir.
        await otpStore.RemoveAsync(request.OtpRef, cancellationToken);

        var user = await LoadActiveUserAsync(entry.UserId, cancellationToken);
        if (user is null)
        {
            return Result<OtpVerifyResponse>.Fail(UserNotFoundError);
        }

        var tokens = await IssueTokensAsync(user, cancellationToken);

        // isNewUser: ad henüz doldurulmamışsa mobil profil tamamlama akışına yönlendirilir (PRD §5.1).
        var isNewUser = string.IsNullOrWhiteSpace(user.FirstName);

        return Result<OtpVerifyResponse>.Ok(new OtpVerifyResponse(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.ExpiresInSeconds,
            isNewUser,
            new AuthUserDto(user.Id, user.FirstName, user.LastName)));
    }

    public async Task<Result<RefreshResponse>> RefreshAsync(
        RefreshRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Result<RefreshResponse>.Fail(RefreshInvalidError);
        }

        // ROTASYON: TakeAsync oku+sil yapar — eski refresh bu noktada tüketilir,
        // aynı token ikinci kez kullanılamaz (replay engeli).
        var userId = await refreshTokenStore.TakeAsync(Sha256(request.RefreshToken), cancellationToken);
        if (userId is null)
        {
            return Result<RefreshResponse>.Fail(RefreshInvalidError);
        }

        var user = await LoadActiveUserAsync(userId.Value, cancellationToken);
        if (user is null)
        {
            // Kullanıcı pasif/silinmiş: oturum yenilenemez (401).
            return Result<RefreshResponse>.Fail(RefreshInvalidError);
        }

        var tokens = await IssueTokensAsync(user, cancellationToken);
        return Result<RefreshResponse>.Ok(new RefreshResponse(
            tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresInSeconds));
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return;
        }

        // Hash silinir; token zaten geçersizse de sessizce başarı (API_CONTRACT §1: her durumda 204).
        await refreshTokenStore.TakeAsync(Sha256(request.RefreshToken), cancellationToken);
    }

    /// <summary>
    /// Login öncesi kullanıcı bulma. DİKKAT — anonim bağlamda tenant claim'i olmadığı için
    /// global query filter TÜM kullanıcıları gizler; bu yüzden filtre burada AÇIK GEREKÇEYLE
    /// IgnoreQueryFilters ile aşılır (ARCHITECTURE §3.3) ve soft-delete (DeletedAt == null) +
    /// durum (Status == Active) + tenant koşulları aşağıda ELLE uygulanır.
    /// </summary>
    private async Task<Result<User>> FindUserForLoginAsync(
        string phone, string? companyCode, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(companyCode))
        {
            var code = companyCode.Trim();

            // Tenant entity'sinde query filter yok; aktif firma koşulu açıkça uygulanır.
            var tenant = await dbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Code == code && t.Status == TenantStatus.Active, cancellationToken);
            if (tenant is null)
            {
                return Result<User>.Fail(UserNotFoundError);
            }

            var user = await dbContext.Users
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.TenantId == tenant.Id
                        && u.Phone == phone
                        && u.DeletedAt == null
                        && u.Status == EntityStatus.Active,
                    cancellationToken);

            return user is null ? Result<User>.Fail(UserNotFoundError) : Result<User>.Ok(user);
        }

        // Firma kodu verilmediyse telefon TÜM tenant'larda aranır (login fallback, PRD §5.1).
        var matches = await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.Phone == phone && u.DeletedAt == null && u.Status == EntityStatus.Active)
            .Take(2) // birden fazla eşleşme tespiti için 2 kayıt yeterli
            .ToListAsync(cancellationToken);

        return matches.Count switch
        {
            0 => Result<User>.Fail(UserNotFoundError),
            1 => Result<User>.Ok(matches[0]),
            _ => Result<User>.Fail(CompanyCodeRequiredError),
        };
    }

    /// <summary>
    /// Kullanıcıyı id ile yükler. Anonim bağlamda global filter gizleyeceği için
    /// IgnoreQueryFilters + açık soft-delete/durum koşulları kullanılır (ARCHITECTURE §3.3).
    /// </summary>
    private Task<User?> LoadActiveUserAsync(Guid userId, CancellationToken cancellationToken) =>
        dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Id == userId && u.DeletedAt == null && u.Status == EntityStatus.Active,
                cancellationToken);

    /// <summary>Token çifti üretir ve refresh'in SHA256 hash'ini store'a bağlar (ham token saklanmaz).</summary>
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

    private string CreateOtpCode()
    {
        // Geliştirme kolaylığı: DevFixedOtp doluysa sabit kod (yalnızca Development config'i doldurur).
        if (!string.IsNullOrEmpty(_authOptions.DevFixedOtp))
        {
            return _authOptions.DevFixedOtp;
        }

        // 6 haneli kripto-rastgele kod: Random değil RandomNumberGenerator — tahmin edilemez olmalı.
        return RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
    }

    private static bool IsValidPhone(string phone) =>
        phone.Length is >= 10 and <= 11 && phone.All(char.IsAsciiDigit);

    private static string Sha256(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
