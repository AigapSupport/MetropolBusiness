using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Cards;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Metropol kart + bakiye/işlem uçları (API_CONTRACT §5-6): hepsi backend proxy,
/// istemci Metropol'e doğrudan gitmez. Tenant izolasyonu query filter'larda,
/// kullanıcı kimliği ITenantContext.UserId'den; controller incedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/metropol")]
[Authorize(Policy = PolicyNames.TenantUser)]
public sealed class MetropolCardsController(
    ICardsService cardsService,
    IBalanceService balanceService) : ControllerBase
{
    /// <summary>GET /metropol/cards — kullanıcının kartları { items: [...] }.</summary>
    [HttpGet("cards")]
    public async Task<IActionResult> GetCards(CancellationToken cancellationToken) =>
        (await cardsService.ListAsync(cancellationToken)).ToActionResult();

    /// <summary>POST /metropol/cards/add — AddAccount proxy, 200 { validationGuid }.</summary>
    [HttpPost("cards/add")]
    public async Task<IActionResult> AddCard(
        AddCardRequest request, CancellationToken cancellationToken) =>
        (await cardsService.AddAsync(request, cancellationToken)).ToActionResult();

    /// <summary>POST /metropol/cards/confirm — AddAccountConfirm proxy, 201 { cardId, ... }.</summary>
    [HttpPost("cards/confirm")]
    public async Task<IActionResult> ConfirmCard(
        ConfirmCardRequest request, CancellationToken cancellationToken) =>
        (await cardsService.ConfirmAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>DELETE /metropol/cards/{cardId} — DeleteUser proxy + soft-delete, 204.</summary>
    [HttpDelete("cards/{cardId:guid}")]
    public async Task<IActionResult> DeleteCard(Guid cardId, CancellationToken cancellationToken) =>
        (await cardsService.DeleteAsync(cardId, cancellationToken)).ToNoContentResult();

    /// <summary>
    /// GET /metropol/cards/{cardId}/balance — BalanceQuery proxy; ?walletId opsiyonel
    /// (varsayılan tüm cüzdanlar), ?refresh=true ~30 sn cache'i atlar (manuel yenileme).
    /// </summary>
    [HttpGet("cards/{cardId:guid}/balance")]
    public async Task<IActionResult> GetBalance(
        Guid cardId,
        [FromQuery] int? walletId = null,
        [FromQuery] bool refresh = false,
        CancellationToken cancellationToken = default) =>
        (await balanceService.GetBalanceAsync(cardId, walletId, refresh, cancellationToken))
            .ToActionResult();

    /// <summary>
    /// GET /metropol/cards/{cardId}/transactions — TransactionHistory proxy,
    /// sayfalı zarf (§0.4); ?startDate&amp;endDate tarih aralığı filtresi (ISO-8601).
    /// </summary>
    [HttpGet("cards/{cardId:guid}/transactions")]
    public async Task<IActionResult> GetTransactions(
        Guid cardId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] DateTimeOffset? startDate = null,
        [FromQuery] DateTimeOffset? endDate = null,
        CancellationToken cancellationToken = default) =>
        (await balanceService.GetTransactionsAsync(
            cardId, page, pageSize, startDate, endDate, cancellationToken)).ToActionResult();

    /// <summary>GET /metropol/cards/{cardId}/recent — son 5 işlem (ana ekran kısayolu).</summary>
    [HttpGet("cards/{cardId:guid}/recent")]
    public async Task<IActionResult> GetRecent(Guid cardId, CancellationToken cancellationToken) =>
        (await balanceService.GetRecentAsync(cardId, cancellationToken)).ToActionResult();
}
