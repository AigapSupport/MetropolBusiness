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
    IMetropolApiClient metropolApiClient) : ICardsService
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
        if (string.IsNullOrWhiteSpace(request.CardNo) || string.IsNullOrWhiteSpace(request.MobilePhone))
        {
            // Hata detayına kart no/telefon DEĞERİ yazılmaz (PII) — yalnızca alan adları.
            return Result<AddCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Kart numarası ve telefon alanları zorunludur.",
                400,
                new { fields = new[] { "cardNo", "mobilePhone" } }));
        }

        // Bu adımda DB'ye kayıt YAZILMAZ: kart ancak OTP doğrulanınca (confirm) oluşur.
        var response = await metropolApiClient.AddAccountAsync(
            new AddAccountRequest { CardNo = request.CardNo.Trim(), MobilePhone = request.MobilePhone.Trim() },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<AddCardResponse>.Fail(MetropolError(response.ResponseCode));
        }

        return Result<AddCardResponse>.Ok(new AddCardResponse(response.ValidationGuid));
    }

    public async Task<Result<ConfirmCardResponse>> ConfirmAsync(
        ConfirmCardRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ValidationGuid) || string.IsNullOrWhiteSpace(request.Phone))
        {
            return Result<ConfirmCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Doğrulama bilgileri eksik.",
                400,
                new { fields = new[] { "validationGuid", "phone" } }));
        }

        var userId = RequiredUserId;
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return Result<ConfirmCardResponse>.Fail(new Error(
                ErrorCodes.NotFound, "Kullanıcı bulunamadı.", 404));
        }

        // MemberId İSTEKTEN ALINMAZ: istemci başka kullanıcının MemberId'sini deneyemesin diye
        // her zaman oturum sahibinin users.member_id değeri gönderilir (sözleşme alanı yok sayılır).
        if (string.IsNullOrWhiteSpace(user.MemberId))
        {
            return Result<ConfirmCardResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Metropol üye numaranız (MemberId) tanımlı değil. Lütfen firma yöneticinize başvurun.",
                400,
                new { field = "memberId" }));
        }

        var response = await metropolApiClient.AddAccountConfirmAsync(
            new AddAccountConfirmRequest
            {
                ValidationGuid = request.ValidationGuid.Trim(),
                ValidationCode = request.ValidationCode,
                Phone = request.Phone.Trim(),
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
