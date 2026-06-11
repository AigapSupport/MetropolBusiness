using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Benefits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Platform admin kampanya + kategori yönetimi (API_CONTRACT §13, PANELS_SPEC B.6/B.7).
/// Tüm içerik globaldir (TenantId = null), tüm firmalarda görünür.
/// </summary>
[ApiController]
[Route("api/v1/platform")]
[Authorize(Policy = PolicyNames.PlatformAdmin)]
public class PlatformBenefitsController(IPlatformBenefitsService service) : ControllerBase
{
    [HttpGet("campaign-categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct) =>
        Ok(new { items = await service.GetCategoriesAsync(ct) });

    [HttpPost("campaign-categories")]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CategoryUpsertRequest request, CancellationToken ct) =>
        (await service.CreateCategoryAsync(request, ct)).ToActionResult(StatusCodes.Status201Created);

    [HttpPut("campaign-categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(
        Guid id, [FromBody] CategoryUpsertRequest request, CancellationToken ct) =>
        (await service.UpdateCategoryAsync(id, request, ct)).ToActionResult();

    [HttpDelete("campaign-categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct) =>
        (await service.DeleteCategoryAsync(id, ct)).ToNoContentResult();

    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns(
        [FromQuery] string? categoryCode, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await service.GetCampaignsAsync(categoryCode, page, pageSize, ct));

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign(
        [FromBody] CampaignUpsertRequest request, CancellationToken ct) =>
        (await service.CreateCampaignAsync(request, ct)).ToActionResult(StatusCodes.Status201Created);

    [HttpPut("campaigns/{id:guid}")]
    public async Task<IActionResult> UpdateCampaign(
        Guid id, [FromBody] CampaignUpsertRequest request, CancellationToken ct) =>
        (await service.UpdateCampaignAsync(id, request, ct)).ToActionResult();

    [HttpDelete("campaigns/{id:guid}")]
    public async Task<IActionResult> DeleteCampaign(Guid id, CancellationToken ct) =>
        (await service.DeleteCampaignAsync(id, ct)).ToNoContentResult();
}
