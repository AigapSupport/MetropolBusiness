using MetropolBusiness.Application.Auth;

namespace MetropolBusiness.Infrastructure.Sms;

/// <summary>
/// Sahte SMS gönderici — gerçek sağlayıcı bağlanana kadar hiçbir şey yapmaz.
/// BİLEREK hiçbir şey log'lamaz: OTP kodu ve telefon PII/sırdır, log'a yazılamaz
/// (CLAUDE.md kural 4). Geliştirmede kod için Auth:DevFixedOtp kullanılır.
/// TODO: Gerçek SMS sağlayıcı entegrasyonu (sağlayıcı anahtarları environment/secret store'dan).
/// </summary>
public sealed class NoopSmsSender : ISmsSender
{
    public Task SendOtpAsync(string phone, string code, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
