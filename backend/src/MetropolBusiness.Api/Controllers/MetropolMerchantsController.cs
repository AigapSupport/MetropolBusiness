using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Merchants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>Keşfet uçları (API_CONTRACT §9): üye işyeri listesi + geri bildirim.</summary>
[ApiController]
[Route("api/v1/metropol/merchants")]
[Authorize(Policy = PolicyNames.TenantUser)]
public class MetropolMerchantsController(IMerchantsService merchants) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMerchants(
        [FromQuery] int sectorId = 2, [FromQuery] int listType = 1,
        [FromQuery] string? lastListVersionDate = null, CancellationToken ct = default) =>
        (await merchants.GetMerchantsAsync(sectorId, listType, lastListVersionDate, ct))
            .ToActionResult();

    [HttpPost("{code}/feedback")]
    public async Task<IActionResult> SubmitFeedback(
        string code, [FromBody] MerchantFeedbackRequestDto request, CancellationToken ct) =>
        (await merchants.SubmitFeedbackAsync(code, request, ct))
            .ToActionResult(StatusCodes.Status201Created);
}
