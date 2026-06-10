namespace MetropolBusiness.Application.Auth;

// Panel girişi DTO'ları (TODO 1.9, PANELS_SPEC §0.4 kararı: kendi auth — e-posta+şifre).
// docs/API_CONTRACT.md §1 /auth/login + /auth/set-password alanlarıyla birebir.

/// <summary>
/// POST /auth/login isteği (web/admin panelleri). CompanyCode, e-posta birden fazla
/// firmada kayıtlıysa zorunludur (telefon+OTP akışındaki fallback ile aynı kural).
/// </summary>
public sealed record PanelLoginRequest(string Email, string Password, string? CompanyCode = null);

/// <summary>Login yanıtındaki kullanıcı özeti: { id, firstName, lastName, role } — rol panelde menü/yetki içindir.</summary>
public sealed record PanelUserDto(Guid Id, string? FirstName, string? LastName, string Role);

/// <summary>
/// POST /auth/login yanıtı (OtpVerifyResponse benzeri). isNewUser yok: panel kullanıcıları
/// davetle adlarıyla açılır, profil tamamlama akışı yoktur.
/// </summary>
public sealed record PanelLoginResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    PanelUserDto User);

/// <summary>
/// POST /auth/set-password isteği: davet token'ı (72 saat geçerli, tek kullanımlık)
/// ile şifre belirleme. Politika: en az 8 karakter, en az bir harf + bir rakam.
/// </summary>
public sealed record SetPasswordRequest(string InviteToken, string NewPassword);
