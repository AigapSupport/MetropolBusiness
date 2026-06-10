using System.Globalization;
using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Payments;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Cards;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Metropol = MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Infrastructure.Payments;

/// <summary>
/// Bakiye transferi servisi (TODO 1.7 backend, API_CONTRACT §8). BalanceTransfer parasal
/// uçtur: Idempotency-Key + payment_idempotency ile çift gönderim engellenir (ARCHITECTURE §5.3).
/// Alıcı çözümleme tenant izolasyonuna tabidir: telefon YALNIZCA aynı tenant'ta aranır.
/// Alıcı token'ları yalnızca Metropol isteğinde kullanılır, at-rest ŞİFRELİ saklanır,
/// LOG'LANMAZ; isim/kart no istemciye yalnızca maskeli gider (CLAUDE.md kural 4).
/// </summary>
public sealed class TransfersService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IFieldCipher fieldCipher,
    IMetropolApiClient metropolApiClient,
    IDistributedCache cache) : ITransfersService
{
    /// <summary>Çözülemeyen alıcı alanları için yer tutucu (VARSAYIM, LESSONS.md).</summary>
    private const string UnknownMaskedValue = "***";

    private static readonly Error RecipientNotFoundError = new(
        ErrorCodes.NotFound, "Alıcı bulunamadı.", 404);

    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException(
            "Kullanıcı bağlamı yok: bu işlem oturum açmış kullanıcı gerektirir.");

    /// <summary>Çözümlenmiş alıcı: token + maskeli sunum alanları (+ cache geçersizleştirme için kart).</summary>
    private sealed record ResolvedReceiver(
        string Token, string MaskedName, string MaskedCardNo, Guid? ReceiverCardId);

    public async Task<Result<TransferResponse>> TransferAsync(
        TransferRequest request, string idempotencyKey, CancellationToken cancellationToken = default)
    {
        // Controller başlığı zorunlu kılar; servis savunma amaçlı yine doğrular.
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            return Result<TransferResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "Idempotency-Key başlığı zorunludur.", 400,
                new { header = "Idempotency-Key" }));
        }

        var userId = RequiredUserId;

        // 1) İdempotency: (tenant, key) varsa Metropol'e GİDİLMEZ (ARCHITECTURE §5.3).
        var existing = await IdempotencyGuard.FindAsync(dbContext, idempotencyKey, cancellationToken);
        if (existing is not null)
        {
            return IdempotencyGuard.Replay<TransferResponse>(
                existing, userId, IdempotencyGuard.BalanceTransferOperation);
        }

        // 2) Doğrulamalar pending kaydından ÖNCE (geçersiz istek anahtarı "yakmaz").
        if (!decimal.TryParse(
                request.Amount, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount)
            || amount <= 0)
        {
            return Result<TransferResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "Tutar geçersiz.", 400, new { field = "amount" }));
        }

        // Metropol BalanceTransferRequest.Amount INT'tir (tam sayı TL VARSAYIMI, LESSONS.md
        // "Belgesiz Metropol semantikleri") — kuruşlu tutar sessizce yuvarlanmaz, reddedilir.
        if (amount % 1m != 0m || amount > int.MaxValue)
        {
            return Result<TransferResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "Transfer tutarı tam TL olmalıdır.", 400,
                new { field = "amount" }));
        }

        if (request.SaveRecipient && string.IsNullOrWhiteSpace(request.RecipientLabel))
        {
            return Result<TransferResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "Kayıt adı (recipientLabel) zorunludur.", 400,
                new { field = "recipientLabel" }));
        }

        var senderResult = await ResolveSenderAsync(request.SenderCardId, cancellationToken);
        if (!senderResult.IsSuccess)
        {
            return Result<TransferResponse>.Fail(senderResult.Error!);
        }

        var (senderCard, senderToken, senderName) = senderResult.Value;

        var receiverResult = await ResolveReceiverAsync(request.Receiver, cancellationToken);
        if (!receiverResult.IsSuccess)
        {
            return Result<TransferResponse>.Fail(receiverResult.Error!);
        }

        var receiver = receiverResult.Value;

        // 3) Pending kaydı: UNIQUE ihlali = yarış kaybedildi → 409, Metropol'e gidilmez.
        var pendingResult = await IdempotencyGuard.CreatePendingAsync(
            dbContext, userId, idempotencyKey, IdempotencyGuard.BalanceTransferOperation,
            refCode: null, cancellationToken);
        if (!pendingResult.IsSuccess)
        {
            return Result<TransferResponse>.Fail(pendingResult.Error!);
        }

        var record = pendingResult.Value;

        // 4) BalanceTransfer — retry YOK (para ucu).
        var response = await metropolApiClient.BalanceTransferAsync(
            new Metropol.BalanceTransferRequest
            {
                SenderCardToken = senderToken,
                ReceiverCardToken = receiver.Token,
                WalletId = request.WalletId,
                Amount = (int)amount,
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            var error = MetropolError(response.ResponseCode);
            await IdempotencyGuard.MarkFailedAsync(
                dbContext, record, error, response.ResponseCode, cancellationToken);
            return Result<TransferResponse>.Fail(error);
        }

        var receipt = new TransferResponse(
            Success: true,
            SenderName: senderName,
            ReceiverMaskedName: receiver.MaskedName,
            ReceiverMaskedCardNo: receiver.MaskedCardNo,
            Amount: FormatMoney(amount),
            Date: NowIso());

        // Başarıda kayıtlı alıcı: token ŞİFRELİ saklanır; zaten kayıtlı alıcı tekrar yazılmaz.
        if (request.SaveRecipient && request.Receiver.Type != TransferReceiverTypes.Saved)
        {
            dbContext.SavedRecipients.Add(new SavedRecipient
            {
                UserId = userId,
                Label = request.RecipientLabel!.Trim(),
                MaskedCardNo = receiver.MaskedCardNo,
                RecipientTokenEncrypted = fieldCipher.Encrypt(receiver.Token),
            });
        }

        await IdempotencyGuard.MarkSuccessAsync(dbContext, record, receipt, cancellationToken);

        // Para hareketi sonrası bakiye cache'leri geçersiz kılınır (taze bakiye §6 ucundan).
        await cache.RemoveAsync(BalanceCacheKeys.ForCard(senderCard.Id), cancellationToken);
        if (receiver.ReceiverCardId is { } receiverCardId)
        {
            await cache.RemoveAsync(BalanceCacheKeys.ForCard(receiverCardId), cancellationToken);
        }

        return Result<TransferResponse>.Ok(receipt);
    }

    public Task<Result<ResolveQrResponse>> ResolveQrAsync(
        string? qrPayload, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(qrPayload))
        {
            return Task.FromResult(Result<ResolveQrResponse>.Fail(new Error(
                ErrorCodes.ValidationError, "qrPayload zorunludur.", 400,
                new { field = "qrPayload" })));
        }

        // VARSAYIM (LESSONS.md): alıcı QR içeriği belgesiz. Payload JSON ise bilinen
        // anahtarlardan maskeli alanlar çekilir; değilse TAMAMI opak alıcı token'ı kabul
        // edilir (maskeli alanlar "***"). Metropol test ortamında teyit edilecek.
        var payload = qrPayload.Trim();
        var token = payload;
        var maskedName = UnknownMaskedValue;
        var maskedCardNo = UnknownMaskedValue;

        if (payload.StartsWith('{'))
        {
            try
            {
                using var document = JsonDocument.Parse(payload);
                if (document.RootElement.ValueKind == JsonValueKind.Object)
                {
                    var root = document.RootElement;
                    token = ReadString(root, "receiverToken", "token", "userAccountToken", "cardToken")
                        ?? payload;

                    // Maskeleme backend güvencesi: payload'daki isim/kart no maskesiz
                    // olabilir — istemciye her durumda maskeli gider (CLAUDE.md kural 4).
                    var name = ReadString(root, "name", "fullName", "holderName");
                    maskedName = string.IsNullOrWhiteSpace(name)
                        ? UnknownMaskedValue
                        : (name.Contains('*') ? name : Masking.MaskName(name));

                    var cardNo = ReadString(root, "maskedCardNo", "cardNo");
                    maskedCardNo = string.IsNullOrWhiteSpace(cardNo)
                        ? UnknownMaskedValue
                        : (cardNo.Contains('*') ? cardNo : Masking.MaskCardNo(cardNo));
                }
            }
            catch (JsonException)
            {
                // Bozuk JSON: opak token yoluna düşülür (akış kırılmaz).
            }
        }

        return Task.FromResult(Result<ResolveQrResponse>.Ok(
            new ResolveQrResponse(maskedName, maskedCardNo, token)));
    }

    public async Task<Result<ItemsResponse<SavedRecipientDto>>> ListRecipientsAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Query filter tenant'ı uygular; kullanıcı sahipliği burada eklenir.
        var rows = await dbContext.SavedRecipients
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .ToListAsync(cancellationToken);

        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez
        // (CardsService deseni); kullanıcı başına kayıt sayısı küçüktür.
        var items = rows
            .OrderBy(r => r.CreatedAt)
            .Select(r => new SavedRecipientDto(r.Id, r.Label, r.MaskedCardNo))
            .ToList();

        return Result<ItemsResponse<SavedRecipientDto>>.Ok(
            new ItemsResponse<SavedRecipientDto>(items));
    }

    public async Task<Result<SavedRecipientDto>> AddRecipientAsync(
        SaveRecipientRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Label) || string.IsNullOrWhiteSpace(request.ReceiverToken))
        {
            // Hata detayına token DEĞERİ yazılmaz — yalnızca alan adları (CLAUDE.md kural 4).
            return Result<SavedRecipientDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Kayıt adı ve alıcı token'ı zorunludur.", 400,
                new { fields = new[] { "label", "receiverToken" } }));
        }

        var recipient = new SavedRecipient
        {
            UserId = RequiredUserId,
            Label = request.Label.Trim(),
            // Maskesiz kart no SAKLANMAZ: yıldızsız değer backend'de maskelenir.
            MaskedCardNo = string.IsNullOrWhiteSpace(request.MaskedCardNo)
                ? UnknownMaskedValue
                : (request.MaskedCardNo.Contains('*')
                    ? request.MaskedCardNo.Trim()
                    : Masking.MaskCardNo(request.MaskedCardNo.Trim())),
            RecipientTokenEncrypted = fieldCipher.Encrypt(request.ReceiverToken.Trim()),
        };

        dbContext.SavedRecipients.Add(recipient);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<SavedRecipientDto>.Ok(
            new SavedRecipientDto(recipient.Id, recipient.Label, recipient.MaskedCardNo));
    }

    public async Task<Result<bool>> DeleteRecipientAsync(
        Guid recipientId, CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Sahiplik: tenant query filter + kullanıcı koşulu — başkasının kaydı 404.
        var recipient = await dbContext.SavedRecipients
            .FirstOrDefaultAsync(r => r.Id == recipientId && r.UserId == userId, cancellationToken);
        if (recipient is null)
        {
            return Result<bool>.Fail(RecipientNotFoundError);
        }

        dbContext.SavedRecipients.Remove(recipient);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Ok(true);
    }

    /// <summary>
    /// Gönderen kartı doğrular (tenant + kullanıcı sahipliği), token'ı çözer ve fişteki
    /// gönderen adını belirler (kart sahibi adı, yoksa kullanıcının ad-soyadı — kendi adı
    /// kendisine maskesiz gösterilir).
    /// </summary>
    private async Task<Result<(Card Card, string Token, string SenderName)>> ResolveSenderAsync(
        Guid senderCardId, CancellationToken cancellationToken)
    {
        var userId = RequiredUserId;
        var card = await dbContext.Cards
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == senderCardId && c.UserId == userId, cancellationToken);
        if (card is null)
        {
            return Result<(Card, string, string)>.Fail(new Error(
                ErrorCodes.NotFound, "Kart bulunamadı.", 404));
        }

        var token = fieldCipher.Decrypt(card.UserAccountTokenEncrypted);
        if (token is null)
        {
            return Result<(Card, string, string)>.Fail(new Error(
                ErrorCodes.InternalError, "Kart kaydı doğrulanamadı.", 500));
        }

        var senderName = card.HolderName;
        if (string.IsNullOrWhiteSpace(senderName))
        {
            var user = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            senderName = string.Join(' ', new[] { user?.FirstName, user?.LastName }
                .Where(part => !string.IsNullOrWhiteSpace(part)));
        }

        return Result<(Card, string, string)>.Ok((card, token, senderName ?? string.Empty));
    }

    /// <summary>
    /// Alıcıyı türüne göre çözer (API_CONTRACT §8 receiver):
    /// saved → kendi kayıtlı alıcısının şifreli token'ı çözülür;
    /// phone → AYNI TENANT'ta telefonla aktif kullanıcı → onun aktif kartı (izolasyon);
    /// qr → value OPAK alıcı token'ı kabul edilir (VARSAYIM, LESSONS.md);
    /// card → desteklenmiyor (tam kart no bizde yok, Metropol'de no→token ucu yok — LESSONS.md).
    /// </summary>
    private async Task<Result<ResolvedReceiver>> ResolveReceiverAsync(
        TransferReceiverDto? receiver, CancellationToken cancellationToken)
    {
        if (receiver is null || string.IsNullOrWhiteSpace(receiver.Type)
            || string.IsNullOrWhiteSpace(receiver.Value))
        {
            return Result<ResolvedReceiver>.Fail(new Error(
                ErrorCodes.ValidationError, "Alıcı bilgisi (receiver.type / receiver.value) zorunludur.",
                400, new { field = "receiver" }));
        }

        switch (receiver.Type)
        {
            case TransferReceiverTypes.Saved:
                return await ResolveSavedReceiverAsync(receiver.Value, cancellationToken);

            case TransferReceiverTypes.Phone:
                return await ResolvePhoneReceiverAsync(receiver.Value, cancellationToken);

            case TransferReceiverTypes.Qr:
                // Opak token: kim olduğu bilinmez → maskeli alanlar yer tutucu.
                return Result<ResolvedReceiver>.Ok(new ResolvedReceiver(
                    receiver.Value.Trim(), UnknownMaskedValue, UnknownMaskedValue, null));

            case TransferReceiverTypes.Card:
                // [!] Sözleşme boşluğu (LESSONS.md): tam kart no bizde tutulmaz ve
                // Metropol'de kart no → token dönüşüm ucu yok; tür şimdilik kapalı.
                return Result<ResolvedReceiver>.Fail(new Error(
                    ErrorCodes.ValidationError,
                    "Kart numarasıyla transfer henüz desteklenmiyor.",
                    400,
                    new { field = "receiver.type" }));

            default:
                return Result<ResolvedReceiver>.Fail(new Error(
                    ErrorCodes.ValidationError, "Geçersiz alıcı türü.", 400,
                    new { field = "receiver.type" }));
        }
    }

    private async Task<Result<ResolvedReceiver>> ResolveSavedReceiverAsync(
        string value, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(value, out var recipientId))
        {
            return Result<ResolvedReceiver>.Fail(RecipientNotFoundError);
        }

        var userId = RequiredUserId;
        var recipient = await dbContext.SavedRecipients
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == recipientId && r.UserId == userId, cancellationToken);
        if (recipient is null)
        {
            return Result<ResolvedReceiver>.Fail(RecipientNotFoundError);
        }

        var token = fieldCipher.Decrypt(recipient.RecipientTokenEncrypted);
        if (token is null)
        {
            return Result<ResolvedReceiver>.Fail(new Error(
                ErrorCodes.InternalError, "Alıcı kaydı doğrulanamadı.", 500));
        }

        // Kayıtlı alıcının adı tutulmaz; kullanıcının verdiği kayıt adı maskelenerek gösterilir.
        return Result<ResolvedReceiver>.Ok(new ResolvedReceiver(
            token, Masking.MaskName(recipient.Label), recipient.MaskedCardNo, null));
    }

    private async Task<Result<ResolvedReceiver>> ResolvePhoneReceiverAsync(
        string value, CancellationToken cancellationToken)
    {
        // Tenant izolasyonu KUTSAL (CLAUDE.md kural 1): query filter tenant'ı zaten uygular;
        // yine de açık filtre eklenir — telefon BAŞKA tenant'ta asla aranmaz.
        var tenantId = tenantContext.RequiredTenantId;
        var phone = value.Trim();

        var receiverUser = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Phone == phone && u.TenantId == tenantId && u.Status == EntityStatus.Active,
                cancellationToken);
        if (receiverUser is null)
        {
            return Result<ResolvedReceiver>.Fail(RecipientNotFoundError);
        }

        // Alıcının aktif kartı (soft-delete query filter'da); birden çoksa ilk eklenen.
        // Sıralama bellekte (SQLite DateTimeOffset kısıtı, CardsService deseni).
        var receiverCards = await dbContext.Cards
            .AsNoTracking()
            .Where(c => c.UserId == receiverUser.Id && c.Status == EntityStatus.Active)
            .ToListAsync(cancellationToken);
        var receiverCard = receiverCards.OrderBy(c => c.CreatedAt).FirstOrDefault();
        if (receiverCard is null)
        {
            return Result<ResolvedReceiver>.Fail(RecipientNotFoundError);
        }

        var token = fieldCipher.Decrypt(receiverCard.UserAccountTokenEncrypted);
        if (token is null)
        {
            return Result<ResolvedReceiver>.Fail(new Error(
                ErrorCodes.InternalError, "Alıcı kart kaydı doğrulanamadı.", 500));
        }

        // Maskeleme backend'de: alıcı adı istemciye yalnızca maskeli gider.
        var fullName = string.Join(' ', new[] { receiverUser.FirstName, receiverUser.LastName }
            .Where(part => !string.IsNullOrWhiteSpace(part)));
        var maskedName = string.IsNullOrWhiteSpace(fullName)
            ? UnknownMaskedValue
            : Masking.MaskName(fullName);

        return Result<ResolvedReceiver>.Ok(new ResolvedReceiver(
            token, maskedName, receiverCard.MaskedCardNo, receiverCard.Id));
    }

    /// <summary>JSON nesnesinden ilk dolu string özelliği okur (büyük/küçük harf duyarsız).</summary>
    private static string? ReadString(JsonElement root, params string[] propertyNames)
    {
        foreach (var property in root.EnumerateObject())
        {
            foreach (var name in propertyNames)
            {
                if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase)
                    && property.Value.ValueKind == JsonValueKind.String)
                {
                    var value = property.Value.GetString();
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value;
                    }
                }
            }
        }

        return null;
    }

    /// <summary>Para bizim sözleşmede string'tir: decimal → "500.00" (InvariantCulture).</summary>
    private static string FormatMoney(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);

    /// <summary>Fiş tarihi UTC ISO-8601 (CLAUDE.md §7: UTC sakla, sunumda yerelleştir).</summary>
    private static string NowIso() =>
        DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

    private static Error MetropolError(int responseCode) => new(
        ErrorCodes.MetropolError,
        MetropolErrorCatalog.GetMessage(responseCode),
        422,
        new { providerCode = responseCode });
}
