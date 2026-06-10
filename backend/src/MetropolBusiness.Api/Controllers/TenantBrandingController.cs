using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Tenants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Anonim tenant marka ucu (TODO 1.10 backend): GET /tenants/{code}/branding →
/// { name, logoUrl, primaryColor, secondaryColor }. Mobil login ÖNCESİ temayı buradan
/// yükler (white-label); yalnızca AKTİF tenant döner, PII yoktur. Controller incedir.
/// </summary>
[ApiController]
[Route("api/v1/tenants")]
[AllowAnonymous]
public sealed class TenantBrandingController(ITenantBrandingService tenantBrandingService)
    : ControllerBase
{
    /// <summary>GET /tenants/{code}/branding — pasif/bilinmeyen firma 404.</summary>
    [HttpGet("{code}/branding")]
    public async Task<IActionResult> GetBranding(string code, CancellationToken cancellationToken) =>
        (await tenantBrandingService.GetBrandingAsync(code, cancellationToken)).ToActionResult();
}
