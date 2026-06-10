namespace MetropolBusiness.Application.Auth;

// Auth uçlarının istek/yanıt DTO'ları — docs/API_CONTRACT.md §1 alanlarıyla birebir.
// JSON serileştirme ASP.NET Core varsayılanıyla otomatik camelCase'dir.

/// <summary>POST /auth/otp/send isteği. CompanyCode, telefon birden fazla firmada kayıtlıysa zorunludur.</summary>
public sealed record OtpSendRequest(string Phone, string? CompanyCode = null);

/// <summary>POST /auth/otp/send yanıtı: { otpRef, expiresInSeconds, resendInSeconds }.</summary>
public sealed record OtpSendResponse(string OtpRef, int ExpiresInSeconds, int ResendInSeconds);

/// <summary>POST /auth/otp/verify isteği: { otpRef, code, phone }.</summary>
public sealed record OtpVerifyRequest(string OtpRef, string Code, string Phone);

/// <summary>Verify yanıtındaki kullanıcı özeti: { id, firstName, lastName }.</summary>
public sealed record AuthUserDto(Guid Id, string? FirstName, string? LastName);

/// <summary>POST /auth/otp/verify yanıtı. IsNewUser: ad boşsa profil tamamlama akışına gider.</summary>
public sealed record OtpVerifyResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    bool IsNewUser,
    AuthUserDto User);

/// <summary>POST /auth/refresh isteği: { refreshToken }.</summary>
public sealed record RefreshRequest(string RefreshToken);

/// <summary>POST /auth/refresh yanıtı: yeni access + ROTASYONLU yeni refresh.</summary>
public sealed record RefreshResponse(string AccessToken, string RefreshToken, int ExpiresIn);

/// <summary>POST /auth/logout isteği: { refreshToken } → her durumda 204.</summary>
public sealed record LogoutRequest(string RefreshToken);
