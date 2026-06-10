namespace MetropolBusiness.Application.Users;

// /me DTO'ları — docs/API_CONTRACT.md §2 alanlarıyla birebir.
// JSON serileştirme ASP.NET Core varsayılanıyla otomatik camelCase'dir.
// PII kuralı: TCKN istemciye YALNIZCA maskeli gider (tcknMasked); düz değer asla dönmez.

/// <summary>Tenant marka değerleri (white-label) — /me yanıtındaki tenant.branding.</summary>
public sealed record MeTenantBrandingDto(
    string? LogoUrl,
    string? PrimaryColor,
    string? SecondaryColor);

/// <summary>/me yanıtındaki tenant özeti — yalnızca kimlik + marka, başka tenant verisi yok.</summary>
public sealed record MeTenantDto(Guid Id, string Name, MeTenantBrandingDto Branding);

/// <summary>GET /me yanıtı. role = "enduser|company_admin|approver" (sözleşme sözlüğü).</summary>
public sealed record MeResponse(
    Guid Id,
    string? FirstName,
    string? LastName,
    string Phone,
    string? Email,
    string? TcknMasked,
    string? City,
    string? AvatarUrl,
    string Role,
    MeTenantDto Tenant);

/// <summary>PUT /me isteği — profil alanları; e-posta/şehir/avatar temizlenebilir (null).</summary>
public sealed record MeUpdateRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    string? City,
    string? AvatarUrl);

/// <summary>PUT /me/tckn isteği — 11 hane doğrulanır; yanıt maskeli döner.</summary>
public sealed record TcknUpdateRequest(string Tckn);

/// <summary>GET/PUT /me/preferences — bildirim toggle'ları (API_CONTRACT §2).</summary>
public sealed record PreferencesDto(
    bool CampaignNotifications,
    bool AnnouncementNotifications);

/// <summary>Modül bilgisi (GET /me/modules): { code, name }.</summary>
public sealed record ModuleInfoDto(string Code, string Name);

/// <summary>GET /me/modules yanıt zarfı: { modules: [...] }.</summary>
public sealed record MeModulesResponse(IReadOnlyList<ModuleInfoDto> Modules);
