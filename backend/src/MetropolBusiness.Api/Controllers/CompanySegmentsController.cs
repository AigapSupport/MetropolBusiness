using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Tenants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Firma admin segment uçları (API_CONTRACT §12 Segmentler): CRUD + segment→modül
/// yetkileri. Tüm uçlar company_admin rolü ve kendi tenant'ıyla sınırlıdır;
/// controller incedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/admin/company")]
[Authorize(Policy = PolicyNames.CompanyAdmin)]
public sealed class CompanySegmentsController(ICompanySegmentsService companySegmentsService)
    : ControllerBase
{
    /// <summary>GET /admin/company/segments — kullanıcı sayısı + modül kodlarıyla.</summary>
    [HttpGet("segments")]
    public async Task<IActionResult> GetSegments(CancellationToken cancellationToken) =>
        (await companySegmentsService.GetSegmentsAsync(cancellationToken)).ToActionResult();

    /// <summary>POST /admin/company/segments — 201.</summary>
    [HttpPost("segments")]
    public async Task<IActionResult> CreateSegment(
        SegmentUpsertRequest request, CancellationToken cancellationToken) =>
        (await companySegmentsService.CreateSegmentAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>PUT /admin/company/segments/{id}.</summary>
    [HttpPut("segments/{id:guid}")]
    public async Task<IActionResult> UpdateSegment(
        Guid id, SegmentUpsertRequest request, CancellationToken cancellationToken) =>
        (await companySegmentsService.UpdateSegmentAsync(id, request, cancellationToken))
            .ToActionResult();

    /// <summary>
    /// DELETE /admin/company/segments/{id} — 204; segmentte kullanıcı varsa
    /// VALIDATION_ERROR + details.userCount uyarısı döner.
    /// </summary>
    [HttpDelete("segments/{id:guid}")]
    public async Task<IActionResult> DeleteSegment(Guid id, CancellationToken cancellationToken) =>
        (await companySegmentsService.DeleteSegmentAsync(id, cancellationToken)).ToNoContentResult();

    /// <summary>PUT /admin/company/segments/{id}/modules — { moduleCodes } komple değişim.</summary>
    [HttpPut("segments/{id:guid}/modules")]
    public async Task<IActionResult> UpdateSegmentModules(
        Guid id, SegmentModulesUpdateRequest request, CancellationToken cancellationToken) =>
        (await companySegmentsService.UpdateSegmentModulesAsync(id, request, cancellationToken))
            .ToActionResult();
}
