using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Tenants;

/// <summary>
/// Platform admin firma yönetimi (TODO 1.9 backend, API_CONTRACT §13 Firmalar).
/// İmplementasyon Infrastructure'dadır. Platform admin TENANT-ÜSTÜDÜR: sorgular
/// IgnoreQueryFilters gerektirir (ARCHITECTURE §3.3, her kullanım açık gerekçeli) ama
/// kişisel veriye (telefon/TCKN) ERİŞEMEZ — yanıt DTO'larında bu alanlar yoktur.
/// </summary>
public interface IPlatformTenantsService
{
    /// <summary>GET /platform/tenants — ?q&amp;status&amp;page sayfalı; PII'siz (userCount sayısı).</summary>
    Task<Result<PagedResponse<PlatformTenantDto>>> GetTenantsAsync(
        string? q, string? status, int page, int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>POST /platform/tenants — 201; code benzersizdir, ihlalde VALIDATION_ERROR.</summary>
    Task<Result<PlatformTenantDto>> CreateTenantAsync(
        TenantCreateRequest request, CancellationToken cancellationToken = default);

    /// <summary>PUT /platform/tenants/{id} — ad/marka/consumer ref + durum değişimi.</summary>
    Task<Result<PlatformTenantDto>> UpdateTenantAsync(
        Guid id, TenantUpdateRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /platform/tenants/{id}/admins — o tenant'ta company_admin rollü kullanıcı
    /// oluşturur (201). Telefon zorunlu (giriş OTP'li) ve tenant içinde benzersizdir.
    /// </summary>
    Task<Result<TenantAdminCreatedDto>> InviteAdminAsync(
        Guid tenantId, TenantAdminInviteRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /platform/tenants/{tenantId}/admins/{userId}/reset-invite — şifre sıfırlama
    /// daveti (e-posta altyapısı gelene dek admin eliyle): o tenant'ın company_admin'i için
    /// YENİ davet token'ı üretir; kullanıcı o tenant'ın company_admin'i değilse 404.
    /// Mevcut şifre korunur — set-password yapılana kadar eski şifre çalışır.
    /// </summary>
    Task<Result<AdminInviteResetDto>> ResetAdminInviteAsync(
        Guid tenantId, Guid userId, CancellationToken cancellationToken = default);
}
