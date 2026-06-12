using MetropolBusiness.Application.Cards;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.EntityFrameworkCore;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Infrastructure.Cards;

/// <summary>
/// Kart yönetimi servisi (TODO 1.4 backend, API_CONTRACT §5). Metropol proxy'si:
/// AddAccount → ValidationGuid, AddAccountConfirm → Card kaydı (token ŞİFRELİ),
/// DeleteUser → soft-delete. Tenant izolasyonu Cards query filter'ıyla sağlanır.
/// KART NO / UserAccountToken hiçbir log'a ve hata detayına YAZILMAZ (CLAUDE.md kural 4).
/// </summary>
public sealed class CardsService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IFieldCipher fieldCipher,
    IMetropolApiClient metropolApiClient,
    IMemberIdGenerator memberIdGenerator,
    Microsoft.Extensions.Logging.ILogger<CardsService> logger) : ICardsService
{
    private static readonly Error CardNotFoundError = new(
        ErrorCodes.NotFound, "Kart bulunamadı.", 404);

    /// <summary>Kart uçları oturum gerektirir; sub claim'i yoksa policy hatasıdır.</summary>
    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException(
            "Kullanıcı bağlamı yok: bu işlem oturum açmış kullanıcı gerektirir.");

    public async Task<Result<ItemsResponse<CardSummaryDto>>> ListAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Query filter tenant + soft-delete'i zaten uygular; kullanıcı sahipliği burada eklenir.
        var rows = await dbContext.Cards
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToListAsync(cancellationToken);

        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez
        // (ContentAdminService deseni); kullanıcı başına kart sayısı küçüktür.
        var cards = rows
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CardSummaryDto(
                c.Id, c.MaskedCardNo, c.HolderName, EnumConverters.EntityStatusToDb(c.Status)))
            .ToList();

        return Result<ItemsResponse<CardSummaryDto>>.Ok(new ItemsResponse<CardSummaryDto>(cards));
    }

    public async Task<Result<AddCardResponse>> AddAsync(
        AddCardRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CardNo))
        {
            // Hata detayına kart no DEĞERİ yazılmaz (PII) — yalnızca alan adı.
            return Result<AddCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Kart numarası zorunludur.",
                400,
                new { fields = new[] { "cardNo" } }));
        }

        // Telefon istemciden GELMEZSE hesaptaki telefon kullanılır (karar 2026-06-12):
        // istemci alanı yalnız hesapta telefon yoksa gösterir.
        var phoneResult = await ResolvePhoneAsync(request.MobilePhone, cancellationToken);
        if (!phoneResult.IsSuccess)
        {
            return Result<AddCardResponse>.Fail(phoneResult.Error!);
        }

        var cardNo = request.CardNo.Trim();

        // Teşhis (9004 avı): yalnız MASKELİ değerler + uzunluklar loglanır (CLAUDE.md kural 4
        // maskeli loga izin verir) — biçim sorunlarını (eksik hane, yanlış numara) görünür kılar.
        logger.LogInformation(
            "AddAccount denemesi: kart={MaskedCardNo} ({CardLen} hane), tel={MaskedPhone} ({PhoneLen} hane)",
            Masking.MaskCardNo(cardNo), cardNo.Length,
            Masking.MaskPhone(phoneResult.Value), phoneResult.Value.Length);

        // Bu adımda DB'ye kayıt YAZILMAZ: kart ancak OTP doğrulanınca (confirm) oluşur.
        var response = await metropolApiClient.AddAccountAsync(
            new AddAccountRequest { CardNo = cardNo, MobilePhone = phoneResult.Value },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<AddCardResponse>.Fail(MetropolError(response.ResponseCode));
        }

        return Result<AddCardResponse>.Ok(new AddCardResponse(response.ValidationGuid));
    }

    /// <summary>
    /// İstekteki telefon boşsa hesaptaki telefonu döner (karar 2026-06-12: istemci
    /// alanı yalnız hesapta telefon yoksa gösterir). İkisi de boşsa validasyon hatası.
    /// </summary>
    private async Task<Result<string>> ResolvePhoneAsync(
        string? requestPhone, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(requestPhone))
        {
            return Result<string>.Ok(requestPhone.Trim());
        }

        var userId = RequiredUserId;
        var phone = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.Phone)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(phone)
            ? Result<string>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Hesabınızda telefon numarası yok; telefon alanı zorunludur.",
                400,
                new { fields = new[] { "mobilePhone" } }))
            : Result<string>.Ok(phone);
    }

    public async Task<Result<ConfirmCardResponse>> ConfirmAsync(
        ConfirmCardRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ValidationGuid))
        {
            return Result<ConfirmCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Doğrulama bilgileri eksik.",
                400,
                new { fields = new[] { "validationGuid" } }));
        }

        var userId = RequiredUserId;
        // TRACKED sorgu: MemberId boşsa burada üretilip kaydedilir (aşağıda).
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return Result<ConfirmCardResponse>.Fail(new Error(
                ErrorCodes.NotFound, "Kullanıcı bulunamadı.", 404));
        }

        // MemberId İSTEKTEN ALINMAZ: istemci başka kullanıcının MemberId'sini deneyemesin diye
        // her zaman oturum sahibinin users.member_id değeri gönderilir (sözleşme alanı yok sayılır).
        // Boşsa BİZ üretip Metropol'e göndeririz (karar 2026-06-12; kısa sayısal — sequence,
        // 32-hex reddedildi) — Metropol çağrısından ÖNCE kaydedilir ki değer kalıcı olsun.
        if (string.IsNullOrWhiteSpace(user.MemberId))
        {
            user.MemberId = await memberIdGenerator.NextAsync(cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // Telefon boşsa hesaptaki telefon kullanılır (AddAsync ile aynı karar).
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? user.Phone : request.Phone.Trim();
        if (string.IsNullOrWhiteSpace(phone))
        {
            return Result<ConfirmCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Hesabınızda telefon numarası yok; telefon alanı zorunludur.",
                400,
                new { fields = new[] { "phone" } }));
        }

        var response = await metropolApiClient.AddAccountConfirmAsync(
            new AddAccountConfirmRequest
            {
                ValidationGuid = request.ValidationGuid.Trim(),
                ValidationCode = request.ValidationCode,
                Phone = phone,
                MemberId = user.MemberId,
                Email = request.Email?.Trim() ?? user.Email ?? string.Empty,
                TCKN = request.Tckn?.Trim() ?? string.Empty,
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<ConfirmCardResponse>.Fail(MetropolError(response.ResponseCode));
        }

        // İstek DTO'sundaki name/surname yanıtı ZENGİNLEŞTİRMEK içindir: Metropol boş dönerse
        // kullanıcının girdiği değerler kullanılır (kart sahibi adı slider'da gösterilir).
        var name = string.IsNullOrWhiteSpace(response.Name) ? request.Name : response.Name;
        var surName = string.IsNullOrWhiteSpace(response.SurName) ? request.Surname : response.SurName;
        var holderName = string.Join(' ', new[] { name, surName }
            .Where(part => !string.IsNullOrWhiteSpace(part)));

        var card = new Card
        {
            UserId = userId,
            // Token at-rest ŞİFRELİ saklanır; düz token kolonu yok (ARCHITECTURE §4.2).
            UserAccountTokenEncrypted = fieldCipher.Encrypt(response.UserAccountToken),
            // Maskeleme backend güvencesi: yanıt maskeli değilse (yıldız içermiyorsa)
            // Masking.MaskCardNo ile maskelenir — DB'ye asla maskesiz kart no yazılmaz.
            MaskedCardNo = !string.IsNullOrEmpty(response.MaskedCardNo) && response.MaskedCardNo.Contains('*')
                ? response.MaskedCardNo
                : Masking.MaskCardNo(response.MaskedCardNo),
            HolderName = string.IsNullOrWhiteSpace(holderName) ? null : holderName,
        };

        dbContext.Cards.Add(card);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<ConfirmCardResponse>.Ok(
            new ConfirmCardResponse(card.Id, card.MaskedCardNo, name, surName));
    }

    public async Task<Result<bool>> DeleteAsync(
        Guid cardId, CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Önce sahiplik: tenant query filter + kullanıcı koşulu — başka kullanıcının/tenant'ın
        // kartı için Metropol'e hiç gidilmez (404 erken döner).
        var card = await dbContext.Cards
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, cancellationToken);
        if (card is null)
        {
            return Result<bool>.Fail(CardNotFoundError);
        }

        // Token yalnızca Metropol isteği için çözülür; LOG'LANMAZ (CLAUDE.md kural 4).
        var userAccountToken = fieldCipher.Decrypt(card.UserAccountTokenEncrypted);
        if (userAccountToken is null)
        {
            // Bozuk/çözülemeyen kayıt: beklenmeyen durum ama akış kırılmaz (Result ile döner).
            return Result<bool>.Fail(new Error(
                ErrorCodes.InternalError, "Kart kaydı doğrulanamadı.", 500));
        }

        // VARSAYIM (belgesiz semantik, LESSONS.md): UserRefNo = çözülmüş UserAccountToken,
        // UserRefType = "2" (token türü) — MetropolDefaults'taki isimli sabitler.
        var response = await metropolApiClient.DeleteUserAsync(
            new DeleteUserRequest
            {
                UserRefType = MetropolDefaults.TokenUserRefTypeText,
                UserRefNo = userAccountToken,
            },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<bool>.Fail(MetropolError(response.ResponseCode));
        }

        // Soft-delete: yalnızca kullanıcının kart bağı kaldırılır (PRD §8.8); kayıt kalır.
        card.DeletedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Ok(true);
    }

    /// <summary>
    /// Metropol ResponseCode != 0 → 422 METROPOL_ERROR + katalog Türkçe mesajı
    /// (API_CONTRACT §0.3); ham kod yalnızca details.providerCode'da (PII değildir).
    /// </summary>
    private static Error MetropolError(int responseCode) => new(
        ErrorCodes.MetropolError,
        MetropolErrorCatalog.GetMessage(responseCode),
        422,
        new { providerCode = responseCode });
}
