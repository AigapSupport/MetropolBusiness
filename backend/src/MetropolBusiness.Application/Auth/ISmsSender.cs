namespace MetropolBusiness.Application.Auth;

/// <summary>SMS gönderim soyutlaması (gerçek sağlayıcı Infrastructure'da).</summary>
public interface ISmsSender
{
    /// <summary>
    /// OTP SMS'i gönderir. Telefon ve kod PII/sırdır: implementasyonlar bunları
    /// ASLA log'lamaz (CLAUDE.md kural 4).
    /// </summary>
    Task SendOtpAsync(string phone, string code, CancellationToken cancellationToken = default);
}
