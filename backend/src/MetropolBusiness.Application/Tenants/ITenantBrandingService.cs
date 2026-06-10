using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Tenants;

/// <summary>
/// Anonim tenant marka ucu (TODO 1.10 backend): GET /tenants/{code}/branding.
/// Mobil, login ÖNCESİ firma koduna göre temayı bu uçtan yükler (white-label).
/// Yalnızca AKTİF tenant döner; PII yok. İmplementasyon Infrastructure'dadır.
/// </summary>
public interface ITenantBrandingService
{
    /// <summary>Firma koduna göre marka değerleri; pasif/bulunamayan tenant NOT_FOUND (404).</summary>
    Task<Result<TenantBrandingResponse>> GetBrandingAsync(
        string code, CancellationToken cancellationToken = default);
}
