using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Tenants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Firma admin kullanıcı uçları (API_CONTRACT §12 Kullanıcılar): liste/ekle/güncelle/
/// pasifleştir + segment atama. Tüm uçlar company_admin rolü ve kendi tenant'ıyla
/// sınırlıdır (CompanyContentController deseni); controller incedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/admin/company")]
[Authorize(Policy = PolicyNames.CompanyAdmin)]
public sealed class CompanyUsersController(ICompanyUsersService companyUsersService) : ControllerBase
{
    /// <summary>GET /admin/company/users — ?q&amp;segmentId&amp;status&amp;page sayfalı liste.</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? q,
        [FromQuery] Guid? segmentId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        (await companyUsersService.GetUsersAsync(q, segmentId, status, page, pageSize, cancellationToken))
            .ToActionResult();

    /// <summary>POST /admin/company/users — davet/ekle (201); telefon tenant içinde benzersiz.</summary>
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser(
        CompanyUserCreateRequest request, CancellationToken cancellationToken) =>
        (await companyUsersService.CreateUserAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>PUT /admin/company/users/{id} — profil/rol/durum güncelleme.</summary>
    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser(
        Guid id, CompanyUserUpdateRequest request, CancellationToken cancellationToken) =>
        (await companyUsersService.UpdateUserAsync(id, request, cancellationToken)).ToActionResult();

    /// <summary>DELETE /admin/company/users/{id} — pasifleştirir (hard delete YOK), 204.</summary>
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeactivateUser(Guid id, CancellationToken cancellationToken) =>
        (await companyUsersService.DeactivateUserAsync(id, cancellationToken)).ToNoContentResult();

    /// <summary>PUT /admin/company/users/{id}/segments — { segmentIds } komple değişim.</summary>
    [HttpPut("users/{id:guid}/segments")]
    public async Task<IActionResult> UpdateUserSegments(
        Guid id, UserSegmentsUpdateRequest request, CancellationToken cancellationToken) =>
        (await companyUsersService.UpdateUserSegmentsAsync(id, request, cancellationToken))
            .ToActionResult();
}
