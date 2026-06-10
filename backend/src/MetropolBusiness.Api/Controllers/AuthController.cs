using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Auth uçları (API_CONTRACT §1): OTP login + refresh rotasyonu + logout.
/// Controller incedir; tüm iş kuralı IAuthService'tedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/auth")]
[AllowAnonymous]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>POST /auth/otp/send — OTP üretir ve SMS gönderir.</summary>
    [HttpPost("otp/send")]
    public async Task<IActionResult> SendOtp(OtpSendRequest request, CancellationToken cancellationToken) =>
        (await authService.SendOtpAsync(request, cancellationToken)).ToActionResult();

    /// <summary>POST /auth/otp/verify — kodu doğrular, token çifti döner.</summary>
    [HttpPost("otp/verify")]
    public async Task<IActionResult> VerifyOtp(OtpVerifyRequest request, CancellationToken cancellationToken) =>
        (await authService.VerifyOtpAsync(request, cancellationToken)).ToActionResult();

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
