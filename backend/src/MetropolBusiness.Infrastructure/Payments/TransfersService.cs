using System.Globalization;
using System.Text.Json;
using MetropolBusiness.Application.Auth;
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
    IDistributedCache cache,
    IRateLimiter rateLimiter) : ITransfersService
{
    /// <summary>Çözülemeyen alıcı alanları için yer tutucu (VARSAYIM, LESSONS.md).</summary>
    private const string UnknownMaskedValue = "***";

    /// <summary>
    /// Alıcı kartı doğrulama (verify-card) SMS kotası: kullanıcı başına 5/saat —
    /// AddAccount her çağrıda alıcının telefonuna OTP SMS'i gönderir (SMS bombalama engeli,
    /// CLAUDE.md §8 rate-limit).
    /// </summary>
    private const int RecipientVerifyMaxPerWindow = 5;

    /// <summary>Anahtar öneki kullanıcı bazlıdır: "rcpverify:{userId}".</summary>
    private const string RecipientVerifyKeyPrefix = "rcpverify:";

    private static readonly TimeSpan RecipientVerifyWindow = TimeSpan.FromHours(1);

    private static readonly Error RecipientNotFoundError = new(
        ErrorCodes.NotFound, "Alıcı bulunamadı.", 404);

    private static readonly Error RecipientVerifyRateLimitedError = new(
        ErrorCodes.RateLimited,
        "Çok fazla doğrulama isteği gönderildi. Lütfen daha sonra tekrar deneyin.",
        429);

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

    public async Task<Result<ReceiveQrResponse>> GetReceiveQrAsync(
        Guid cardId, CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Sahiplik: tenant query filter + kullanıcı koşulu — başkasının kartına QR üretilemez.
        var card = await dbContext.Cards.AsNoTracking()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, cancellationToken);
        if (card is null)
        {
            return Result<ReceiveQrResponse>.Fail(new Error(
                ErrorCodes.NotFound, "Kart bulunamadı.", 404));
        }

        var token = fieldCipher.Decrypt(card.UserAccountTokenEncrypted);
        if (token is null)
        {
            return Result<ReceiveQrResponse>.Fail(new Error(
                ErrorCodes.InternalError, "Kart kaydı doğrulanamadı.", 500));
        }

        // ResolveQrAsync'in çözebildiği JSON biçimi: token + MASKELİ ad/kart no —
        // göstericinin kim olduğu, okutan tarafın onay ekranında maskeli görünür.
        var holderName = string.IsNullOrWhiteSpace(card.HolderName)
            ? string.Join(' ', new[] { card.User?.FirstName, card.User?.LastName }
                .Where(part => !string.IsNullOrWhiteSpace(part)))
            : card.HolderName;
        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            token,
            name = string.IsNullOrWhiteSpace(holderName) ? UnknownMaskedValue : Masking.MaskName(holderName),
            cardNo = card.MaskedCardNo,
        });

        return Result<ReceiveQrResponse>.Ok(new ReceiveQrResponse(payload));
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

    public async Task<Result<VerifyRecipientCardResponse>> VerifyRecipientCardAsync(
        VerifyRecipientCardRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CardNo) || string.IsNullOrWhiteSpace(request.MobilePhone))
        {
            // Hata detayına kart no/telefon DEĞERİ yazılmaz (PII) — yalnızca alan adları
            // (CardsService.AddAsync deseni).
            return Result<VerifyRecipientCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Kart numarası ve telefon alanları zorunludur.",
                400,
                new { fields = new[] { "cardNo", "mobilePhone" } }));
        }

        var userId = RequiredUserId;

        // SMS bombalama engeli: kota geçersiz istekte (yukarıda elendi) DEĞİL, yalnızca
        // Metropol'e SMS tetikleyecek isteklerde harcanır. Anahtar kullanıcı bazlıdır.
        if (!await rateLimiter.TryAcquireAsync(
                RecipientVerifyKeyPrefix + userId,
                RecipientVerifyWindow,
                RecipientVerifyMaxPerWindow,
                cancellationToken))
        {
            return Result<VerifyRecipientCardResponse>.Fail(RecipientVerifyRateLimitedError);
        }

        // Alıcının kartı bizim cards tablosuna YAZILMAZ: AddAccount yalnızca alıcının
        // karta kayıtlı telefonuna OTP SMS'i başlatır; kart no/telefon LOGLANMAZ.
        var response = await metropolApiClient.AddAccountAsync(
            new Metropol.AddAccountRequest
            {
                CardNo = request.CardNo.Trim(),
                MobilePhone = request.MobilePhone.Trim(),
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<VerifyRecipientCardResponse>.Fail(MetropolError(response.ResponseCode));
        }

        return Result<VerifyRecipientCardResponse>.Ok(
            new VerifyRecipientCardResponse(response.ValidationGuid));
    }

    public async Task<Result<ConfirmRecipientCardResponse>> ConfirmRecipientCardAsync(
        ConfirmRecipientCardRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ValidationGuid))
        {
            return Result<ConfirmRecipientCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Doğrulama bilgileri eksik.",
                400,
                new { fields = new[] { "validationGuid" } }));
        }

        var userId = RequiredUserId;
        var sender = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (sender is null)
        {
            return Result<ConfirmRecipientCardResponse>.Fail(new Error(
                ErrorCodes.NotFound, "Kullanıcı bulunamadı.", 404));
        }

        // MemberId sözleşmede zorunlu alan: CardsService.ConfirmAsync'teki gibi her zaman
        // GÖNDERENİN users.member_id'si gönderilir (istemciden alınmaz). VARSAYIM
        // (LESSONS.md "Belgesiz Metropol semantikleri"): bu bağlamanın Metropol tarafında
        // gönderene kalıcı kart bağı oluşturup oluşturmadığı belgesiz — Metropol testinde
        // teyit edilecek (gerekirse DeleteUser ile temizlik).
        if (string.IsNullOrWhiteSpace(sender.MemberId))
        {
            return Result<ConfirmRecipientCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Metropol üye numaranız (MemberId) tanımlı değil. Lütfen firma yöneticinize başvurun.",
                400,
                new { field = "memberId" }));
        }

        // Phone/Email/TCKN bilinçli BOŞ: bu akış yalnızca OTP doğrulaması içindir,
        // alıcı adına profil verisi (PII) gönderilmez ve bizde tutulmaz.
        var response = await metropolApiClient.AddAccountConfirmAsync(
            new Metropol.AddAccountConfirmRequest
            {
                ValidationGuid = request.ValidationGuid.Trim(),
                ValidationCode = request.ValidationCode,
                Phone = string.Empty,
                MemberId = sender.MemberId,
                Email = string.Empty,
                TCKN = string.Empty,
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<ConfirmRecipientCardResponse>.Fail(MetropolError(response.ResponseCode));
        }

        // CardsService.ConfirmAsync'ten FARK: alıcının kartı cards tablosuna KAYDEDİLMEZ.
        // UserAccountToken istemciye OPAK receiverToken olarak döner ve yalnızca transfer
        // isteğinde (receiver.type="card") kullanılır — resolve-qr ile aynı desen.
        var fullName = string.Join(' ', new[] { response.Name, response.SurName }
            .Where(part => !string.IsNullOrWhiteSpace(part)));
        var maskedName = string.IsNullOrWhiteSpace(fullName)
            ? UnknownMaskedValue
            : Masking.MaskName(fullName);

        // Maskeleme backend güvencesi: yanıt maskeli değilse (yıldız içermiyorsa)
        // Masking.MaskCardNo ile maskelenir — istemciye maskesiz kart no gitmez.
        var maskedCardNo = string.IsNullOrEmpty(response.MaskedCardNo)
            ? UnknownMaskedValue
            : (response.MaskedCardNo.Contains('*')
                ? response.MaskedCardNo
                : Masking.MaskCardNo(response.MaskedCardNo));

        return Result<ConfirmRecipientCardResponse>.Ok(new ConfirmRecipientCardResponse(
            maskedName, maskedCardNo, response.UserAccountToken));
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
    /// card → value confirm-card adımından dönen OPAK doğrulanmış alıcı token'ıdır
    /// (AddAccount OTP akışı — kart numarası DEĞİL; LESSONS.md).
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
                return await ResolveCardReceiverAsync(receiver.Value, cancellationToken);

            default:
                return Result<ResolvedReceiver>.Fail(new Error(
                    ErrorCodes.ValidationError, "Geçersiz alıcı türü.", 400,
                    new { field = "receiver.type" }));
        }
    }

    /// <summary>
    /// type=card iki anlamı kapsar (API_CONTRACT §8):
    /// 1) Kartlarım Arası: value, kullanıcının KENDİ kartının id'sidir (GUID) → şifreli token
    ///    çözülür, maskeli alanlar kart kaydından gelir.
    /// 2) Başka Karta: value, confirm-card adımından dönen OPAK doğrulanmış alıcı token'ıdır.
    /// Ayrım: GUID biçiminde olup kullanıcının kendi aktif kartıyla eşleşiyorsa (1);
    /// değilse (2). Çakışma pratikte imkânsız: Metropol token'ının, bu kullanıcının bizdeki
    /// kart UUID'lerinden biriyle birebir aynı olması gerekirdi.
    /// </summary>
    private async Task<Result<ResolvedReceiver>> ResolveCardReceiverAsync(
        string value, CancellationToken cancellationToken)
    {
        var trimmed = value.Trim();

        if (Guid.TryParse(trimmed, out var ownCardId))
        {
            var userId = RequiredUserId;
            // Sahiplik: tenant query filter + kullanıcı koşulu — başkasının kart id'si
            // eşleşmez ve değer opak token muamelesi görür (bilgi sızıntısı yok).
            var ownCard = await dbContext.Cards
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == ownCardId && c.UserId == userId, cancellationToken);

            if (ownCard is not null)
            {
                var ownToken = fieldCipher.Decrypt(ownCard.UserAccountTokenEncrypted);
                if (ownToken is null)
                {
                    return Result<ResolvedReceiver>.Fail(new Error(
                        ErrorCodes.InternalError, "Kart kaydı doğrulanamadı.", 500));
                }

                var maskedName = string.IsNullOrWhiteSpace(ownCard.HolderName)
                    ? UnknownMaskedValue
                    : Masking.MaskName(ownCard.HolderName);

                return Result<ResolvedReceiver>.Ok(new ResolvedReceiver(
                    ownToken, maskedName, ownCard.MaskedCardNo, ownCard.Id));
            }
        }

        // Başka Karta: confirm-card'dan dönen opak token — kim olduğu bizde tutulmaz.
        return Result<ResolvedReceiver>.Ok(new ResolvedReceiver(
            trimmed, UnknownMaskedValue, UnknownMaskedValue, null));
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
