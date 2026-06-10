using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Auth;

/// <summary>
/// OTP login + refresh rotasyonu use-case'leri (TODO 1.2, API_CONTRACT §1).
/// Beklenen hatalar Result ile döner; implementasyon Infrastructure'dadır
/// (AppDbContext gerektirir — katman yönü: Api → Application → Domain).
/// </summary>
public interface IAuthService
{
    /// <summary>POST /auth/otp/send — kullanıcıyı bulur, OTP üretip SMS gönderir.</summary>
    Task<Result<OtpSendResponse>> SendOtpAsync(OtpSendRequest request, CancellationToken cancellationToken = default);

    /// <summary>POST /auth/otp/verify — kodu doğrular, token çifti üretir (3 deneme kilidi).</summary>
    Task<Result<OtpVerifyResponse>> VerifyOtpAsync(OtpVerifyRequest request, CancellationToken cancellationToken = default);

    /// <summary>POST /auth/refresh — rotasyon: eski refresh tüketilir, yeni çift döner.</summary>
    Task<Result<RefreshResponse>> RefreshAsync(RefreshRequest request, CancellationToken cancellationToken = default);

    /// <summary>POST /auth/logout — refresh'i geçersiz kılar; her durumda başarı (204).</summary>
    Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken = default);
}
