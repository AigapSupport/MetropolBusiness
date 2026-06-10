using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Content;

/// <summary>
/// Firma admin içerik yönetimi use-case'leri (TODO 1.8, API_CONTRACT §12 İçerik).
/// İmplementasyon Infrastructure'dadır (AppDbContext gerektirir; AuthService deseni).
/// Tüm işlemler isteği yapan admin'in kendi tenant'ı ile sınırlıdır — firma admin
/// global (TenantId null) duyuruları GÖREMEZ/DEĞİŞTİREMEZ (CLAUDE.md kural 1).
/// </summary>
public interface IContentAdminService
{
    // ── Anketler ────────────────────────────────────────────────────────────

    /// <summary>GET /admin/company/surveys — taslaklar dahil tüm tenant anketleri.</summary>
    Task<Result<ItemsResponse<AdminSurveyListItemDto>>> GetSurveysAsync(
        CancellationToken cancellationToken = default);

    /// <summary>GET /admin/company/surveys/{id} — sorularla birlikte.</summary>
    Task<Result<AdminSurveyDetailDto>> GetSurveyAsync(
        Guid id, CancellationToken cancellationToken = default);

    /// <summary>POST /admin/company/surveys — anket + nested sorular oluşturur.</summary>
    Task<Result<AdminSurveyDetailDto>> CreateSurveyAsync(
        SurveyUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>PUT /admin/company/surveys/{id} — günceller; sorular komple değiştirilir,
    /// yayımla/yayımdan kaldır status alanıyla yapılır.</summary>
    Task<Result<AdminSurveyDetailDto>> UpdateSurveyAsync(
        Guid id, SurveyUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>DELETE /admin/company/surveys/{id}.</summary>
    Task<Result<bool>> DeleteSurveyAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>GET /admin/company/surveys/{id}/results — soru bazında dağılım (basit sayım).</summary>
    Task<Result<SurveyResultsDto>> GetSurveyResultsAsync(
        Guid id, CancellationToken cancellationToken = default);

    // ── Duyurular ───────────────────────────────────────────────────────────

    /// <summary>GET /admin/company/announcements — yalnız kendi tenant'ın duyuruları.</summary>
    Task<Result<ItemsResponse<AdminAnnouncementDto>>> GetAnnouncementsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>POST /admin/company/announcements — segment hedefli duyuru oluşturur.</summary>
    Task<Result<AdminAnnouncementDto>> CreateAnnouncementAsync(
        AnnouncementUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>PUT /admin/company/announcements/{id}.</summary>
    Task<Result<AdminAnnouncementDto>> UpdateAnnouncementAsync(
        Guid id, AnnouncementUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>DELETE /admin/company/announcements/{id}.</summary>
    Task<Result<bool>> DeleteAnnouncementAsync(Guid id, CancellationToken cancellationToken = default);

    // ── Videolar ────────────────────────────────────────────────────────────

    /// <summary>GET /admin/company/videos.</summary>
    Task<Result<ItemsResponse<AdminVideoDto>>> GetVideosAsync(
        CancellationToken cancellationToken = default);

    /// <summary>POST /admin/company/videos.</summary>
    Task<Result<AdminVideoDto>> CreateVideoAsync(
        VideoUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>PUT /admin/company/videos/{id}.</summary>
    Task<Result<AdminVideoDto>> UpdateVideoAsync(
        Guid id, VideoUpsertRequest request, CancellationToken cancellationToken = default);

    /// <summary>DELETE /admin/company/videos/{id}.</summary>
    Task<Result<bool>> DeleteVideoAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>GET /admin/company/videos/{id}/watch-report — kullanıcı bazlı izleme listesi.</summary>
    Task<Result<VideoWatchReportDto>> GetVideoWatchReportAsync(
        Guid id, CancellationToken cancellationToken = default);
}
