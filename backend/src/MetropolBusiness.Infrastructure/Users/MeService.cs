using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Users;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Users;

/// <summary>
/// /me servisi (TODO 1.9 backend, API_CONTRACT §2). IMeService implementasyonu
/// Infrastructure'dadır çünkü AppDbContext gerektirir (AuthService deseni).
/// Tenant izolasyonu Users query filter'ıyla (TenantId + soft-delete) sağlanır.
/// TCKN düz metin DB'ye yazılmaz/log'lanmaz; istemciye YALNIZCA maskeli gider
/// (CLAUDE.md kural 4 — maskeleme backend'de, Masking.MaskTckn).
/// </summary>
public sealed class MeService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IFieldCipher fieldCipher) : IMeService
{
    /// <summary>PreferencesJson sözleşmeyle aynı biçimde (camelCase) saklanır.</summary>
    private static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);

    /// <summary>Kayıt yoksa tercih varsayılanları: tüm bildirimler açık.</summary>
    private static readonly PreferencesDto DefaultPreferences = new(
        CampaignNotifications: true, AnnouncementNotifications: true);

    private static readonly Error UserNotFoundError = new(
        ErrorCodes.NotFound, "Kullanıcı bulunamadı.", 404);

    /// <summary>/me uçları oturum gerektirir; sub claim'i yoksa policy hatasıdır.</summary>
    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException(
            "Kullanıcı bağlamı yok: bu işlem oturum açmış kullanıcı gerektirir.");

    public async Task<Result<MeResponse>> GetMeAsync(CancellationToken cancellationToken = default)
    {
        var user = await LoadMeAsync(track: false, cancellationToken);
        return user is null
            ? Result<MeResponse>.Fail(UserNotFoundError)
            : Result<MeResponse>.Ok(ToMeResponse(user));
    }

    public async Task<Result<MeResponse>> UpdateMeAsync(
        MeUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var firstName = request.FirstName?.Trim();
        var lastName = request.LastName?.Trim();
        if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName))
        {
            // Ad/soyad boşaltılamaz: isNewUser/profil tamamlama mantığı FirstName'e dayanır (PRD §5.1).
            return Result<MeResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Ad ve soyad alanları zorunludur.",
                400,
                new { fields = new[] { "firstName", "lastName" } }));
        }

        var email = request.Email?.Trim();
        if (!string.IsNullOrEmpty(email) && !email.Contains('@'))
        {
            return Result<MeResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Geçerli bir e-posta adresi girin.",
                400,
                new { field = "email" }));
        }

        var user = await LoadMeAsync(track: true, cancellationToken);
        if (user is null)
        {
            return Result<MeResponse>.Fail(UserNotFoundError);
        }

        user.FirstName = firstName;
        user.LastName = lastName;
        user.Email = string.IsNullOrEmpty(email) ? null : email;
        user.City = string.IsNullOrWhiteSpace(request.City) ? null : request.City.Trim();
        user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<MeResponse>.Ok(ToMeResponse(user));
    }

    public async Task<Result<MeResponse>> UpdateTcknAsync(
        TcknUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var tckn = request.Tckn?.Trim() ?? string.Empty;
        if (tckn.Length != 11 || !tckn.All(char.IsAsciiDigit))
        {
            // Hata detayına TCKN değeri YAZILMAZ (PII).
            return Result<MeResponse>.Fail(new Error(
                ErrorCodes.ValidationError,
                "T.C. Kimlik No 11 haneli ve yalnızca rakamlardan oluşmalıdır.",
                400,
                new { field = "tckn" }));
        }

        var user = await LoadMeAsync(track: true, cancellationToken);
        if (user is null)
        {
            return Result<MeResponse>.Fail(UserNotFoundError);
        }

        // At-rest şifreleme IFieldCipher arkasında: şimdilik placeholder ("enc:"+Base64),
        // gerçek şifreleme (DataProtection/KMS) Faz sonrası implementasyon değişimiyle gelir.
        user.TcknEncrypted = fieldCipher.Encrypt(tckn);

        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<MeResponse>.Ok(ToMeResponse(user));
    }

    public async Task<Result<PreferencesDto>> GetPreferencesAsync(
        CancellationToken cancellationToken = default)
    {
        var user = await LoadMeAsync(track: false, cancellationToken);
        return user is null
            ? Result<PreferencesDto>.Fail(UserNotFoundError)
            : Result<PreferencesDto>.Ok(ParsePreferences(user.PreferencesJson));
    }

    public async Task<Result<PreferencesDto>> UpdatePreferencesAsync(
        PreferencesDto request, CancellationToken cancellationToken = default)
    {
        var user = await LoadMeAsync(track: true, cancellationToken);
        if (user is null)
        {
            return Result<PreferencesDto>.Fail(UserNotFoundError);
        }

        user.PreferencesJson = JsonSerializer.Serialize(request, JsonWeb);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<PreferencesDto>.Ok(request);
    }

    public async Task<Result<MeModulesResponse>> GetModulesAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Segment BİRLEŞİMİ: kullanıcının tüm segmentlerindeki modüller distinct toplanır;
        // pasif modül tanımları listelenmez. SegmentModules query filter'ı tenant'a kapalıdır.
        // Distinct anonim tip üzerinde: ctor'lu DTO projeksiyonu EF tarafından çevrilemiyor.
        var rows = await dbContext.SegmentModules
            .AsNoTracking()
            .Where(sm => sm.Segment!.UserSegments.Any(us => us.UserId == userId))
            .Where(sm => sm.Module!.IsActive)
            .Select(sm => new { sm.Module!.Code, sm.Module.Name })
            .Distinct()
            .OrderBy(m => m.Code)
            .ToListAsync(cancellationToken);

        var modules = rows
            .Select(m => new ModuleInfoDto(m.Code, m.Name))
            .ToList();

        return Result<MeModulesResponse>.Ok(new MeModulesResponse(modules));
    }

    public async Task<Result<bool>> DeleteMeAsync(CancellationToken cancellationToken = default)
    {
        var user = await LoadMeAsync(track: true, cancellationToken);
        if (user is null)
        {
            return Result<bool>.Fail(new Error(ErrorCodes.NotFound, "Kullanıcı bulunamadı.", 404));
        }

        // SOFT delete (CLAUDE.md kural 7): kayıt kalır, sorgu filtreleri gizler;
        // OTP/refresh akışları aktif+silinmemiş aradığından oturum yenilenemez.
        user.Status = EntityStatus.Passive;
        user.DeletedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Ok(true);
    }

    /// <summary>
    /// Oturum sahibini tenant filtreli sorgudan yükler (başka tenant'ın kullanıcısı
    /// görünmez); Tenant navigation'ı /me yanıtındaki branding için dahil edilir.
    /// </summary>
    private async Task<User?> LoadMeAsync(bool track, CancellationToken cancellationToken)
    {
        var userId = RequiredUserId;
        var query = dbContext.Users.Include(u => u.Tenant).AsQueryable();
        if (!track)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    private MeResponse ToMeResponse(User user)
    {
        var tenant = user.Tenant
            ?? throw new InvalidOperationException("Kullanıcının tenant kaydı yüklenemedi.");

        // Maskeleme backend'de: şifreli değer çözülür, YALNIZCA maskeli hali yanıta girer.
        var plainTckn = fieldCipher.Decrypt(user.TcknEncrypted);
        var tcknMasked = string.IsNullOrEmpty(plainTckn) ? null : Masking.MaskTckn(plainTckn);

        return new MeResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Phone,
            user.Email,
            tcknMasked,
            user.City,
            user.AvatarUrl,
            IdentityEnumMapping.RoleToWire(user.Role),
            new MeTenantDto(
                tenant.Id,
                tenant.Name,
                new MeTenantBrandingDto(
                    tenant.BrandLogoUrl,
                    tenant.BrandPrimaryColor,
                    tenant.BrandSecondaryColor)));
    }

    private static PreferencesDto ParsePreferences(string preferencesJson)
    {
        if (string.IsNullOrWhiteSpace(preferencesJson) || preferencesJson == "{}")
        {
            return DefaultPreferences;
        }

        try
        {
            return JsonSerializer.Deserialize<PreferencesDto>(preferencesJson, JsonWeb)
                ?? DefaultPreferences;
        }
        catch (JsonException)
        {
            // Bozuk kayıt akışı kırmasın: varsayılanlara dönülür.
            return DefaultPreferences;
        }
    }
}
