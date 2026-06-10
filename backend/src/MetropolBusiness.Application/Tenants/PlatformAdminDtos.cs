namespace MetropolBusiness.Application.Tenants;

// Platform admin DTO'ları — docs/API_CONTRACT.md §13. Platform admin tenant-üstüdür
// ama KİŞİSEL VERİYE ERİŞEMEZ: bu dosyadaki yanıt tiplerinde bilinçli olarak
// telefon/TCKN/e-posta alanı YOKTUR — PII dönmemesi derleme zamanında garanti edilir.

/// <summary>Tenant marka değerleri (white-label) — oluştur/güncelle + listede döner.</summary>
public sealed record TenantBrandingDto(
    string? LogoUrl,
    string? PrimaryColor,
    string? SecondaryColor);

/// <summary>
/// Platform tenant satırı (GET /platform/tenants). PII YOK: kullanıcı listesi/telefon
/// yerine yalnızca userCount sayısı döner (API_CONTRACT §13 kuralı).
/// </summary>
public sealed record PlatformTenantDto(
    Guid Id,
    string Name,
    string Code,
    string Status,
    TenantBrandingDto Branding,
    int UserCount,
    DateTimeOffset CreatedAt);

/// <summary>
/// Tenant oluştur (POST /platform/tenants). metropolConsumerId secret store REFERANSIDIR
/// (MetropolConsumerRef'e yazılır); gerçek ConsumerId değeri repoya/DB'ye girmez (CLAUDE.md kural 2).
/// </summary>
public sealed record TenantCreateRequest(
    string Name,
    string Code,
    string? MetropolConsumerId,
    TenantBrandingDto? Branding);

/// <summary>
/// Tenant güncelle + durum değişimi (PUT /platform/tenants/{id}).
/// null alan = değiştirme; status "pending|active|passive". Code değişimi bilinçli yok
/// (login fallback anahtarıdır; değişim ayrı karar gerektirir).
/// </summary>
public sealed record TenantUpdateRequest(
    string? Name,
    string? MetropolConsumerId,
    TenantBrandingDto? Branding,
    string? Status);

/// <summary>
/// Firma admin daveti (POST /platform/tenants/{id}/admins). Telefon ZORUNLU —
/// panel/mobil girişi OTP ile telefon üzerindendir; e-posta + ad da alınır.
/// </summary>
public sealed record TenantAdminInviteRequest(
    string Phone,
    string FirstName,
    string? LastName,
    string? Email);

/// <summary>
/// Davet yanıtı — PII'siz: oluşturulan admin'in kimliği + tenant + rol döner,
/// telefon/e-posta geri yansıtılmaz. InviteToken: şifre belirleme daveti
/// (POST /auth/set-password, 72 saat geçerli, tek kullanımlık) — YALNIZCA bu yanıtta
/// döner (admin UI gösterir), tekrar sorgulanamaz ve LOG'A YAZILMAZ (CLAUDE.md kural 4).
/// </summary>
public sealed record TenantAdminCreatedDto(
    Guid Id,
    Guid TenantId,
    string? FirstName,
    string? LastName,
    string Role,
    string InviteToken);

/// <summary>Modül tanımı (GET /platform/modules): { code, name, isActive }.</summary>
public sealed record PlatformModuleDto(Guid Id, string Code, string Name, bool IsActive);

/// <summary>Modül oluştur/güncelle isteği (POST/PUT /platform/modules).</summary>
public sealed record ModuleUpsertRequest(string Code, string Name, bool IsActive);

/// <summary>
/// GET /tenants/{code}/branding yanıtı (TODO 1.10) — mobil login ÖNCESİ tema yüklemesi
/// için anonim uçtur; PII içermez, yalnızca marka değerleri döner.
/// </summary>
public sealed record TenantBrandingResponse(
    string Name,
    string? LogoUrl,
    string? PrimaryColor,
    string? SecondaryColor);
