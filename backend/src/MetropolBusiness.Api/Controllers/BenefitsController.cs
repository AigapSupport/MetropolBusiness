using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Benefits;
using MetropolBusiness.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>Yan haklar okuma uçları (API_CONTRACT §4, PRD §7).</summary>
[ApiController]
[Route("api/v1/benefits")]
[Authorize(Policy = PolicyNames.TenantUser)]
public class BenefitsController(IBenefitsService benefits) : ControllerBase
{
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct) =>
        Ok(new ItemsResponse<BenefitCategoryDto>(await benefits.GetCategoriesAsync(ct)));

    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns(
        [FromQuery] string? categoryCode, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await benefits.GetCampaignsAsync(categoryCode, page, pageSize, ct));

    [HttpGet("campaigns/{id:guid}")]
    public async Task<IActionResult> GetCampaign(Guid id, CancellationToken ct) =>
        (await benefits.GetCampaignAsync(id, ct)).ToActionResult();

    [HttpGet("coupons")]
    public async Task<IActionResult> GetCoupons(CancellationToken ct) =>
        Ok(new ItemsResponse<BenefitItemDto>(await benefits.GetCouponsAsync(ct)));

    [HttpGet("giftcards")]
    public async Task<IActionResult> GetGiftCards(CancellationToken ct) =>
        Ok(new ItemsResponse<BenefitItemDto>(await benefits.GetGiftCardsAsync(ct)));
}
