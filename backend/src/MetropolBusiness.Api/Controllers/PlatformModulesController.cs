using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Tenants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Platform admin modül tanımı uçları (API_CONTRACT §13 Modül tanımları):
/// { code, name, isActive }. Modüller platform seviyesidir; segmentlere atama
/// firma admin uçlarındadır. Controller incedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/platform")]
[Authorize(Policy = PolicyNames.PlatformAdmin)]
public sealed class PlatformModulesController(IPlatformModulesService platformModulesService)
    : ControllerBase
{
    /// <summary>GET /platform/modules — pasifler dahil tüm tanımlar.</summary>
    [HttpGet("modules")]
    public async Task<IActionResult> GetModules(CancellationToken cancellationToken) =>
        (await platformModulesService.GetModulesAsync(cancellationToken)).ToActionResult();

    /// <summary>POST /platform/modules — 201; code benzersiz.</summary>
    [HttpPost("modules")]
    public async Task<IActionResult> CreateModule(
        ModuleUpsertRequest request, CancellationToken cancellationToken) =>
        (await platformModulesService.CreateModuleAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>PUT /platform/modules/{id} — ad/kod/durum güncelleme.</summary>
    [HttpPut("modules/{id:guid}")]
    public async Task<IActionResult> UpdateModule(
        Guid id, ModuleUpsertRequest request, CancellationToken cancellationToken) =>
        (await platformModulesService.UpdateModuleAsync(id, request, cancellationToken))
            .ToActionResult();
}
