using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Content;

/// <summary>
/// Platform admin GLOBAL duyuru yönetimi (API_CONTRACT §13, PANELS_SPEC B.5):
/// TenantId = null yazılır, tüm firmalarda görünür; segment hedefleme YOK (global).
/// Şirket duyuru DTO'ları yeniden kullanılır — SegmentIds global içerikte hep boştur.
/// </summary>
public interface IPlatformContentService
{
    Task<PagedResponse<AdminAnnouncementDto>> GetAnnouncementsAsync(
        int page, int pageSize, CancellationToken ct = default);

    Task<Result<AdminAnnouncementDto>> CreateAsync(
        AnnouncementUpsertRequest request, CancellationToken ct = default);

    Task<Result<AdminAnnouncementDto>> UpdateAsync(
        Guid id, AnnouncementUpsertRequest request, CancellationToken ct = default);

    Task<Result<bool>> DeleteAsync(Guid id, CancellationToken ct = default);
}
