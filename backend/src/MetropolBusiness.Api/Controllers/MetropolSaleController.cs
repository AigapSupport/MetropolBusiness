using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Metropol harcama uçları (API_CONTRACT §7 — SIRA ÖNEMLİ: kod → kart seç → presale →
/// onay → confirm). Hepsi backend proxy; istemci Metropol'e doğrudan gitmez.
/// sale/confirm parasal uçtur: Idempotency-Key başlığı ZORUNLUDUR (ARCHITECTURE §5.3).
/// </summary>
[ApiController]
[Route("api/v1/metropol")]
[Authorize(Policy = PolicyNames.TenantUser)]
public sealed class MetropolSaleController(IPaymentsService paymentsService) : ControllerBase
{
    /// <summary>POST /metropol/sale/presale-info — GetPreSaleInfo proxy (tutar/mağaza/ürün).</summary>
    [HttpPost("sale/presale-info")]
    public async Task<IActionResult> PresaleInfo(
        PresaleInfoRequest request, CancellationToken cancellationToken) =>
        (await paymentsService.PresaleAsync(request, cancellationToken)).ToActionResult();

    /// <summary>
    /// POST /metropol/sale/confirm — SaleConfirm proxy. Idempotency-Key ZORUNLU:
    /// başlık yoksa istek işlenmeden VALIDATION_ERROR döner (çift harcama koruması).
    /// </summary>
    [HttpPost("sale/confirm")]
    public async Task<IActionResult> ConfirmSale(
        SaleConfirmRequest request, CancellationToken cancellationToken)
    {
        if (!IdempotencyKeyHeader.TryGet(Request, out var idempotencyKey))
        {
            return IdempotencyKeyHeader.MissingResult();
        }

        return (await paymentsService.ConfirmSaleAsync(request, idempotencyKey, cancellationToken))
            .ToActionResult();
    }

    /// <summary>GET /metropol/sale/info — GetSaleInfo proxy (işlem durumu 0/1/2/4).</summary>
    [HttpGet("sale/info")]
    public async Task<IActionResult> GetSaleInfo(
        [FromQuery] string? merchantCode = null,
        [FromQuery] string? terminalCode = null,
        [FromQuery] string? saleRefCode = null,
        CancellationToken cancellationToken = default) =>
        (await paymentsService.GetSaleInfoAsync(
            merchantCode, terminalCode, saleRefCode, cancellationToken)).ToActionResult();
}
