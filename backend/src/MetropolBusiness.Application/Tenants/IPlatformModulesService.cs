using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Tenants;

/// <summary>
/// Platform admin modül tanımları (TODO 1.9 backend, API_CONTRACT §13 Modül tanımları).
/// Modüller platform seviyesidir (tenant'a ait DEĞİL); segmentlere atama firma admin'in
/// işidir (ICompanySegmentsService). İmplementasyon Infrastructure'dadır.
/// </summary>
public interface IPlatformModulesService
{
    /// <summary>GET /platform/modules — pasifler dahil tüm tanımlar.</summary>
    Task<Result<ItemsResponse<PlatformModuleDto>>> GetModulesAsync(
        CancellationToken cancellationToken = default);

    /// <summary>POST /platform/modules — 201; code benzersizdir, ihlalde VALIDATION_ERROR.</summary>
    Task<Result<PlatformModuleDto>> CreateModuleAsync(
        ModuleUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>PUT /platform/modules/{id} — ad/durum (isActive) güncelleme.</summary>
    Task<Result<PlatformModuleDto>> UpdateModuleAsync(
        Guid id, ModuleUpsertRequest request, CancellationToken cancellationToken = default);
}
