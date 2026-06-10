using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Tenants;

/// <summary>
/// Firma admin segment yönetimi (TODO 1.9 backend, API_CONTRACT §12 Segmentler).
/// İmplementasyon Infrastructure'dadır; Segments query filter'ı tenant'a kapalıdır.
/// Modül yetkileri segment bazında verilir (CLAUDE.md §13).
/// </summary>
public interface ICompanySegmentsService
{
    /// <summary>GET /admin/company/segments — kullanıcı sayısı + modül kodlarıyla.</summary>
    Task<Result<ItemsResponse<CompanySegmentDto>>> GetSegmentsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>POST /admin/company/segments — 201; ad tenant içinde benzersizdir.</summary>
    Task<Result<CompanySegmentDto>> CreateSegmentAsync(
        SegmentUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>PUT /admin/company/segments/{id}.</summary>
    Task<Result<CompanySegmentDto>> UpdateSegmentAsync(
        Guid id, SegmentUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// DELETE /admin/company/segments/{id} — segmentte kullanıcı varsa silinmez:
    /// VALIDATION_ERROR + details.userCount (önce kullanıcılar taşınmalı).
    /// </summary>
    Task<Result<bool>> DeleteSegmentAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// PUT /admin/company/segments/{id}/modules — { moduleCodes } komple değişim.
    /// Tanımsız veya pasif modül kodu VALIDATION_ERROR (details.invalidModuleCodes).
    /// </summary>
    Task<Result<CompanySegmentDto>> UpdateSegmentModulesAsync(
        Guid id, SegmentModulesUpdateRequest request, CancellationToken cancellationToken = default);
}
