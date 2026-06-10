using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Tenants;

/// <summary>
/// Anonim tenant marka ucu (TODO 1.10 backend): GET /tenants/{code}/branding.
/// Mobil, login ÖNCESİ firma koduna göre temayı buradan yükler (white-label, hardcode renk yok).
/// Tenant entity'sinde query filter yok; AKTİF olmayan firma 404 döner (pasif firma →
/// kullanıcıları erişemez, PANELS_SPEC B.3 kabul kriteri). Yanıtta PII yoktur.
/// </summary>
public sealed class TenantBrandingService(AppDbContext dbContext) : ITenantBrandingService
{
    private static readonly Error TenantNotFoundError = new(
        ErrorCodes.NotFound, "Firma bulunamadı.", 404);

    public async Task<Result<TenantBrandingResponse>> GetBrandingAsync(
        string code, CancellationToken cancellationToken = default)
    {
        var normalized = code?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            return Result<TenantBrandingResponse>.Fail(TenantNotFoundError);
        }

        // Yalnızca aktif tenant: pending/passive firma anonim uçtan görünmez (sızıntı yok).
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(
                t => t.Code == normalized && t.Status == TenantStatus.Active, cancellationToken);

        return tenant is null
            ? Result<TenantBrandingResponse>.Fail(TenantNotFoundError)
            : Result<TenantBrandingResponse>.Ok(new TenantBrandingResponse(
                tenant.Name,
                tenant.BrandLogoUrl,
                tenant.BrandPrimaryColor,
                tenant.BrandSecondaryColor));
    }
}
