using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Tenants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Platform admin firma uçları (API_CONTRACT §13 Firmalar): liste/oluştur/güncelle +
/// firma admin daveti. Platform admin tenant-üstüdür ama KİŞİSEL VERİYE ERİŞEMEZ —
/// yanıtlar PII'sizdir (userCount sayısı, telefon/TCKN yok). Controller incedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/platform")]
[Authorize(Policy = PolicyNames.PlatformAdmin)]
public sealed class PlatformTenantsController(IPlatformTenantsService platformTenantsService)
    : ControllerBase
{
    /// <summary>GET /platform/tenants — ?q&amp;status&amp;page sayfalı liste (PII'siz).</summary>
    [HttpGet("tenants")]
    public async Task<IActionResult> GetTenants(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        (await platformTenantsService.GetTenantsAsync(q, status, page, pageSize, cancellationToken))
            .ToActionResult();

    /// <summary>POST /platform/tenants — oluştur (201); code benzersiz.</summary>
    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant(
        TenantCreateRequest request, CancellationToken cancellationToken) =>
        (await platformTenantsService.CreateTenantAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>PUT /platform/tenants/{id} — ad/marka/consumer ref + durum değişimi.</summary>
    [HttpPut("tenants/{id:guid}")]
    public async Task<IActionResult> UpdateTenant(
        Guid id, TenantUpdateRequest request, CancellationToken cancellationToken) =>
        (await platformTenantsService.UpdateTenantAsync(id, request, cancellationToken))
            .ToActionResult();

    /// <summary>POST /platform/tenants/{id}/admins — firma admin daveti (201, telefon zorunlu).</summary>
    [HttpPost("tenants/{id:guid}/admins")]
    public async Task<IActionResult> InviteAdmin(
        Guid id, TenantAdminInviteRequest request, CancellationToken cancellationToken) =>
        (await platformTenantsService.InviteAdminAsync(id, request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);
}
