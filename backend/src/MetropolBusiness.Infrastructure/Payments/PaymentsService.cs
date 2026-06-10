using System.Globalization;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Payments;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Cards;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
// SaleConfirmRequest/Response adları hem bizim sözleşmede (Application.Payments) hem
// Metropol sözleşmesinde (MetropolModels) var — using static yerine alias ile ayrıştırılır.
using Metropol = MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Infrastructure.Payments;

/// <summary>
/// Harcama servisi (TODO 1.6 backend, API_CONTRACT §7). Akış CLAUDE.md §6 sırasıyla:
/// kod → kart seçimi → GetPreSaleInfo → onay → SaleConfirm. SaleConfirm parasal uçtur:
/// Idempotency-Key + payment_idempotency ile çift harcama engellenir (ARCHITECTURE §5.3);
/// retry YOKTUR, aynı SaleRefCode/ConsumerRefCode tekrar gönderilmez.
/// Çözülen UserAccountToken yalnızca Metropol isteğinde kullanılır; LOG'LANMAZ (CLAUDE.md kural 4).
/// </summary>
public sealed class PaymentsService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IFieldCipher fieldCipher,
    IMetropolApiClient metropolApiClient,
    IDistributedCache cache) : IPaymentsService
{
    private static readonly Error CardNotFoundError = new(
        ErrorCodes.NotFound, "Kart bulunamadı.", 404);

    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException(
            "Kullanıcı bağlamı yok: bu işlem oturum açmış kullanıcı gerektirir.");

    public async Task<Result<PresaleInfoResponse>> PresaleAsync(
        PresaleInfoRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return Result<PresaleInfoResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "QR/kısa kod zorunludur.", 400,
                new { field = "code" }));
        }

        if (request.CodeType != MetropolDefaults.QrCodeType
            && request.CodeType != MetropolDefaults.QuickCodeType)
        {
            return Result<PresaleInfoResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "Geçersiz kod türü (1=QR, 2=Kısa kod).", 400,
                new { field = "codeType" }));
        }

        var cardResult = await ResolveOwnCardAsync(request.CardId, cancellationToken);
        if (!cardResult.IsSuccess)
        {
            return Result<PresaleInfoResponse>.Fail(cardResult.Error!);
        }

        // MemberId İSTEKTEN ALINMAZ: her zaman oturum sahibinin users.member_id değeri
        // gönderilir (CardsService.ConfirmAsync ile aynı güvenlik gerekçesi).
        var userId = RequiredUserId;
        var memberId = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.MemberId)
            .FirstOrDefaultAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(memberId))
        {
            return Result<PresaleInfoResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Metropol üye numaranız (MemberId) tanımlı değil. Lütfen firma yöneticinize başvurun.",
                400,
                new { field = "memberId" }));
        }

        var response = await metropolApiClient.GetPreSaleInfoAsync(
            new Metropol.GetPreSaleInfoRequest
            {
                Code = request.Code.Trim(),
                CodeType = request.CodeType,
                MemberId = memberId,
                UserAccountRef = cardResult.Value.Token,
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<PresaleInfoResponse>.Fail(MetropolError(response.ResponseCode));
        }

        return Result<PresaleInfoResponse>.Ok(new PresaleInfoResponse(
            response.TransactionId,
            response.SaleRefCode,
            response.MerchantNo,
            response.TerminalNo,
            response.MerchantName,
            response.CityName,
            response.DistrictName,
            FormatMoney(response.RequestAmount),
            response.ProductId,
            response.ProductName,
            // WalletId kuralı (CLAUDE.md §6): ProductId 3 → 3 (Gift), diğerleri → 1 (Resto).
            MetropolDefaults.SuggestedWalletId(response.ProductId),
            response.KDV,
            response.DiscountRatio,
            response.SessionExpireDate));
    }

    public async Task<Result<SaleConfirmResponse>> ConfirmSaleAsync(
        SaleConfirmRequest request, string idempotencyKey, CancellationToken cancellationToken = default)
    {
        // Controller başlığı zorunlu kılar; servis savunma amaçlı yine doğrular.
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return Result<SaleConfirmResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "Idempotency-Key başlığı zorunludur.", 400,
                new { header = "Idempotency-Key" }));
        }

        var userId = RequiredUserId;

        // 1) İdempotency: (tenant, key) varsa Metropol'e GİDİLMEZ (ARCHITECTURE §5.3).
        var existing = await IdempotencyGuard.FindAsync(dbContext, idempotencyKey, cancellationToken);
        if (existing is not null)
        {
            return IdempotencyGuard.Replay<SaleConfirmResponse>(
                existing, userId, IdempotencyGuard.SaleConfirmOperation);
        }

        // 2) Doğrulamalar pending kaydından ÖNCE: geçersiz istek anahtarı "yakmaz",
        //    düzeltilmiş istek aynı anahtarla tekrar denenebilir.
        if (string.IsNullOrWhiteSpace(request.SaleRefCode))
        {
            return Result<SaleConfirmResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "saleRefCode zorunludur.", 400,
                new { field = "saleRefCode" }));
        }

        if (!TryParseMoney(request.Amount, out var amount) || amount <= 0)
        {
            return Result<SaleConfirmResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "Tutar geçersiz.", 400,
                new { field = "amount" }));
        }

        var cardResult = await ResolveOwnCardAsync(request.CardId, cancellationToken);
        if (!cardResult.IsSuccess)
        {
            return Result<SaleConfirmResponse>.Fail(cardResult.Error!);
        }

        var (card, token) = cardResult.Value;

        // 3) Pending kaydı: UNIQUE ihlali = yarış kaybedildi → 409, Metropol'e gidilmez.
        var pendingResult = await IdempotencyGuard.CreatePendingAsync(
            dbContext, userId, idempotencyKey, IdempotencyGuard.SaleConfirmOperation,
            request.SaleRefCode.Trim(), cancellationToken);
        if (!pendingResult.IsSuccess)
        {
            return Result<SaleConfirmResponse>.Fail(pendingResult.Error!);
        }

        var record = pendingResult.Value;

        // ConsumerRefCode boşsa backend üretir (API_CONTRACT §7 "auto-or-client-uuid").
        var consumerRefCode = string.IsNullOrWhiteSpace(request.ConsumerRefCode)
            ? Guid.NewGuid().ToString("N")
            : request.ConsumerRefCode.Trim();

        // 4) SaleConfirm — retry YOK (para ucu); tek ödeme kalemi: kart cüzdanı.
        var response = await metropolApiClient.SaleConfirmAsync(
            new Metropol.SaleConfirmRequest
            {
                PaymentInfo =
                [
                    new Metropol.PaymentInfo
                    {
                        // VARSAYIM (MetropolDefaults + LESSONS.md): 1 = cüzdan ödemesi,
                        // BankRefCode cüzdan ödemesinde boş.
                        PaymentTypeId = MetropolDefaults.WalletPaymentTypeId,
                        UserAccountRef = token,
                        PaymentAmount = amount,
                        WalletId = request.WalletId,
                        BankRefCode = string.Empty,
                    },
                ],
                TransactionAmount = amount,
                TransactionId = request.TransactionId,
                SaleRefCode = request.SaleRefCode.Trim(),
                ConsumerRefCode = consumerRefCode,
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            // Hata anlık görüntüye yazılır: aynı anahtar aynı hatayı döner, aynı
            // SaleRefCode/ConsumerRefCode bir daha GÖNDERİLMEZ (CLAUDE.md §6).
            var error = MetropolError(response.ResponseCode);
            await IdempotencyGuard.MarkFailedAsync(
                dbContext, record, error, response.ResponseCode, cancellationToken);
            return Result<SaleConfirmResponse>.Fail(error);
        }

        var receipt = new SaleConfirmResponse(
            Success: true,
            MerchantNo: response.MerchantNo,
            TerminalNo: response.TerminalNo,
            // Onay no = Metropol TransactionId (işlem geçmişi approvalNo ile aynı kaynak).
            ApprovalNo: request.TransactionId.ToString(CultureInfo.InvariantCulture),
            MaskedCardNo: card.MaskedCardNo,
            Amount: FormatMoney(response.TransactionAmount > 0 ? response.TransactionAmount : amount),
            // Metropol confirm yanıtında mağaza adı dönmez; istemci presale ekranından taşır.
            MerchantName: null,
            Date: NowIso());

        await IdempotencyGuard.MarkSuccessAsync(dbContext, record, receipt, cancellationToken);

        // balanceAfter sözleşmeden kaldırıldı: confirm sonrası bakiye cache'i geçersiz
        // kılınır, istemci güncel bakiyeyi §6 balance ucundan alır (API_CONTRACT §7 notu).
        await cache.RemoveAsync(BalanceCacheKeys.ForCard(card.Id), cancellationToken);

        return Result<SaleConfirmResponse>.Ok(receipt);
    }

    public async Task<Result<SaleInfoResponse>> GetSaleInfoAsync(
        string? merchantCode, string? terminalCode, string? saleRefCode,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(merchantCode) || string.IsNullOrWhiteSpace(terminalCode)
            || string.IsNullOrWhiteSpace(saleRefCode))
        {
            return Result<SaleInfoResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "merchantCode, terminalCode ve saleRefCode zorunludur.",
                400,
                new { fields = new[] { "merchantCode", "terminalCode", "saleRefCode" } }));
        }

        var response = await metropolApiClient.GetSaleInfoAsync(
            new Metropol.GetSaleInfoRequest
            {
                MerchantCode = merchantCode.Trim(),
                TerminalCode = terminalCode.Trim(),
                SaleRefCode = saleRefCode.Trim(),
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<SaleInfoResponse>.Fail(MetropolError(response.ResponseCode));
        }

        return Result<SaleInfoResponse>.Ok(new SaleInfoResponse(
            response.MerchantCode,
            response.TerminalCode,
            response.TransactionId,
            response.TransactionStatus,
            FormatMoney(response.TransactionAmount),
            response.SaleRefCode,
            // Maskeleme backend güvencesi: yanıt maskesizse maskelenir (CLAUDE.md kural 4).
            MaskCardNoDefensively(response.CardNo),
            FormatMoney(response.CardBalance)));
    }

    /// <summary>
    /// Kart sahipliğini doğrular (tenant query filter + kullanıcı koşulu) ve token'ı çözer.
    /// Başka kullanıcının/tenant'ın kartı NOT_FOUND döner — Metropol'e hiç gidilmez.
    /// </summary>
    private async Task<Result<(Card Card, string Token)>> ResolveOwnCardAsync(
        Guid cardId, CancellationToken cancellationToken)
    {
        var userId = RequiredUserId;
        var card = await dbContext.Cards
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, cancellationToken);
        if (card is null)
        {
            return Result<(Card, string)>.Fail(CardNotFoundError);
        }

        var token = fieldCipher.Decrypt(card.UserAccountTokenEncrypted);
        return token is null
            ? Result<(Card, string)>.Fail(new Error(
                ErrorCodes.InternalError, "Kart kaydı doğrulanamadı.", 500))
            : Result<(Card, string)>.Ok((card, token));
    }

    /// <summary>Yıldız içermeyen kart no backend'de maskelenir; boş değer boş döner.</summary>
    private static string MaskCardNoDefensively(string? cardNo) =>
        !string.IsNullOrEmpty(cardNo) && cardNo.Contains('*') ? cardNo : Masking.MaskCardNo(cardNo);

    /// <summary>Para bizim sözleşmede string'tir: decimal → "500.00" (InvariantCulture).</summary>
    private static string FormatMoney(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);

    /// <summary>İstemciden gelen "200.00" biçimli tutarı decimal'e çevirir (nokta ayraç).</summary>
    private static bool TryParseMoney(string? raw, out decimal value) =>
        decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out value);

    /// <summary>Fiş tarihi UTC ISO-8601 (CLAUDE.md §7: UTC sakla, sunumda yerelleştir).</summary>
    private static string NowIso() =>
        DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

    private static Error MetropolError(int responseCode) => new(
        ErrorCodes.MetropolError,
        MetropolErrorCatalog.GetMessage(responseCode),
        422,
        new { providerCode = responseCode });
}
