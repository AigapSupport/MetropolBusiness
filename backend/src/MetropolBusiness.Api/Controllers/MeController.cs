using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// /me uçları (API_CONTRACT §2): profil + TCKN + tercihler + yetkili modüller.
/// Kullanıcı kimliği ITenantContext.UserId'den; tenant izolasyonu query filter'larda.
/// TCKN istemciye yalnızca MASKELİ döner; controller incedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/me")]
[Authorize(Policy = PolicyNames.TenantUser)]
public sealed class MeController(IMeService meService) : ControllerBase
{
    /// <summary>GET /me — profil + tenant.branding (tcknMasked ile).</summary>
    [HttpGet]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken) =>
        (await meService.GetMeAsync(cancellationToken)).ToActionResult();

    /// <summary>PUT /me — firstName/lastName/email/city/avatarUrl; 200 güncel me.</summary>
    [HttpPut]
    public async Task<IActionResult> UpdateMe(
        MeUpdateRequest request, CancellationToken cancellationToken) =>
        (await meService.UpdateMeAsync(request, cancellationToken)).ToActionResult();

    /// <summary>PUT /me/tckn — 11 hane doğrulanır; 200 güncel me (maskeli TCKN).</summary>
    [HttpPut("tckn")]
    public async Task<IActionResult> UpdateTckn(
        TcknUpdateRequest request, CancellationToken cancellationToken) =>
        (await meService.UpdateTcknAsync(request, cancellationToken)).ToActionResult();

    /// <summary>GET /me/preferences — bildirim toggle'ları.</summary>
    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken) =>
        (await meService.GetPreferencesAsync(cancellationToken)).ToActionResult();

    /// <summary>PUT /me/preferences — 200 güncel tercihler.</summary>
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences(
        PreferencesDto request, CancellationToken cancellationToken) =>
        (await meService.UpdatePreferencesAsync(request, cancellationToken)).ToActionResult();

    /// <summary>DELETE /me — hesabımı sil (soft delete; istemci başarıda oturumu kapatır).</summary>
    [HttpDelete]
    public async Task<IActionResult> DeleteMe(CancellationToken cancellationToken) =>
        (await meService.DeleteMeAsync(cancellationToken)).ToNoContentResult();

    /// <summary>GET /me/modules — segmentlerden gelen yetkili modüllerin birleşimi.</summary>
    [HttpGet("modules")]
    public async Task<IActionResult> GetModules(CancellationToken cancellationToken) =>
        (await meService.GetModulesAsync(cancellationToken)).ToActionResult();
}
