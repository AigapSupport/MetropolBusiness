using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Metropol bakiye transferi uçları (API_CONTRACT §8): transfer + QR alıcı çözümleme +
/// kayıtlı alıcı yönetimi. Hepsi backend proxy; alıcı alanları istemciye maskeli gider.
/// transfer parasal uçtur: Idempotency-Key başlığı ZORUNLUDUR (ARCHITECTURE §5.3).
/// </summary>
[ApiController]
[Route("api/v1/metropol")]
[Authorize(Policy = PolicyNames.TenantUser)]
public sealed class MetropolTransferController(ITransfersService transfersService) : ControllerBase
{
    /// <summary>
    /// POST /metropol/transfer — BalanceTransfer proxy. Idempotency-Key ZORUNLU:
    /// başlık yoksa istek işlenmeden VALIDATION_ERROR döner (çift gönderim koruması).
    /// </summary>
    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(
        TransferRequest request, CancellationToken cancellationToken)
    {
        if (!IdempotencyKeyHeader.TryGet(Request, out var idempotencyKey))
        {
            return IdempotencyKeyHeader.MissingResult();
        }

        return (await transfersService.TransferAsync(request, idempotencyKey, cancellationToken))
            .ToActionResult();
    }

    /// <summary>POST /metropol/transfer/resolve-qr — QR'dan alıcı çözümleme (opak token).</summary>
    [HttpPost("transfer/resolve-qr")]
    public async Task<IActionResult> ResolveQr(
        ResolveQrRequest request, CancellationToken cancellationToken) =>
        (await transfersService.ResolveQrAsync(request.QrPayload, cancellationToken)).ToActionResult();

    /// <summary>
    /// POST /metropol/transfer/verify-card — "Başka Karta" alıcı doğrulama 1/2 (AddAccount):
    /// OTP SMS'i alıcının karta kayıtlı telefonuna gider; kullanıcı başına rate-limit (429).
    /// </summary>
    [HttpPost("transfer/verify-card")]
    public async Task<IActionResult> VerifyRecipientCard(
        VerifyRecipientCardRequest request, CancellationToken cancellationToken) =>
        (await transfersService.VerifyRecipientCardAsync(request, cancellationToken)).ToActionResult();

    /// <summary>
    /// POST /metropol/transfer/confirm-card — "Başka Karta" alıcı doğrulama 2/2
    /// (AddAccountConfirm): kart KAYDEDİLMEZ; maskeli alıcı + opak receiverToken döner
    /// (transferde receiver.type="card" value'su).
    /// </summary>
    [HttpPost("transfer/confirm-card")]
    public async Task<IActionResult> ConfirmRecipientCard(
        ConfirmRecipientCardRequest request, CancellationToken cancellationToken) =>
        (await transfersService.ConfirmRecipientCardAsync(request, cancellationToken)).ToActionResult();

    /// <summary>GET /metropol/saved-recipients — kullanıcının kayıtlı alıcıları { items }.</summary>
    [HttpGet("saved-recipients")]
    public async Task<IActionResult> GetSavedRecipients(CancellationToken cancellationToken) =>
        (await transfersService.ListRecipientsAsync(cancellationToken)).ToActionResult();

    /// <summary>POST /metropol/saved-recipients — kayıtlı alıcı ekle (token şifreli saklanır), 201.</summary>
    [HttpPost("saved-recipients")]
    public async Task<IActionResult> AddSavedRecipient(
        SaveRecipientRequest request, CancellationToken cancellationToken) =>
        (await transfersService.AddRecipientAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>DELETE /metropol/saved-recipients/{id} — kendi kaydını siler, 204.</summary>
    [HttpDelete("saved-recipients/{id:guid}")]
    public async Task<IActionResult> DeleteSavedRecipient(
        Guid id, CancellationToken cancellationToken) =>
        (await transfersService.DeleteRecipientAsync(id, cancellationToken)).ToNoContentResult();
}
