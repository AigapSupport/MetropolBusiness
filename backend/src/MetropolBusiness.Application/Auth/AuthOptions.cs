namespace MetropolBusiness.Application.Auth;

/// <summary>OTP/auth ayarları ("Auth" config bölümü).</summary>
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    /// <summary>OTP geçerlilik süresi (API_CONTRACT §1: expiresInSeconds).</summary>
    public int OtpTtlSeconds { get; init; } = 180;

    /// <summary>Telefon başına yeniden kod isteme penceresi (resendInSeconds).</summary>
    public int ResendSeconds { get; init; } = 60;

    /// <summary>Hatalı deneme kilidi eşiği (OTP_LOCKED).</summary>
    public int MaxAttempts { get; init; } = 3;

    /// <summary>
    /// YALNIZCA geliştirme kolaylığı: doluysa rastgele kod yerine bu sabit kod kullanılır
    /// (appsettings.Development.json). Üretim config'inde DAİMA boş kalır.
    /// </summary>
    public string DevFixedOtp { get; init; } = string.Empty;
}
