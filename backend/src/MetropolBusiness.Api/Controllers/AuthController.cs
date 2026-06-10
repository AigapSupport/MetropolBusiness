using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Auth uçları (API_CONTRACT §1): OTP login (mobil) + panel girişi (e-posta+şifre) +
/// refresh rotasyonu + logout. Controller incedir; tüm iş kuralı
/// IAuthService/IPanelAuthService'tedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/auth")]
[AllowAnonymous]
public sealed class AuthController(
    IAuthService authService,
    IPanelAuthService panelAuthService) : ControllerBase
{
    /// <summary>POST /auth/otp/send — OTP üretir ve SMS gönderir.</summary>
    [HttpPost("otp/send")]
    public async Task<IActionResult> SendOtp(OtpSendRequest request, CancellationToken cancellationToken) =>
        (await authService.SendOtpAsync(request, cancellationToken)).ToActionResult();

    /// <summary>POST /auth/otp/verify — kodu doğrular, token çifti döner.</summary>
    [HttpPost("otp/verify")]
    public async Task<IActionResult> VerifyOtp(OtpVerifyRequest request, CancellationToken cancellationToken) =>
        (await authService.VerifyOtpAsync(request, cancellationToken)).ToActionResult();

    /// <summary>
    /// POST /auth/login — panel girişi (e-posta+şifre; yalnız panel rolleri,
    /// PANELS_SPEC §0.4 kararı). Rate-limit (e-posta başına 10/dk) + 5 denemede
    /// 15 dk kilit serviste uygulanır.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(PanelLoginRequest request, CancellationToken cancellationToken) =>
        (await panelAuthService.LoginAsync(request, cancellationToken)).ToActionResult();

    /// <summary>POST /auth/set-password — davet token'ı ile şifre belirleme; başarıda 204.</summary>
    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword(SetPasswordRequest request, CancellationToken cancellationToken) =>
        (await panelAuthService.SetPasswordAsync(request, cancellationToken)).ToNoContentResult();

    /// <summary>POST /auth/refresh — rotasyonlu token yenileme.</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken cancellationToken) =>
        (await authService.RefreshAsync(request, cancellationToken)).ToActionResult();

    /// <summary>POST /auth/logout — refresh geçersiz kılınır; her durumda 204.</summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken cancellationToken)
    {
        await authService.LogoutAsync(request, cancellationToken);
        return NoContent();
    }
}
