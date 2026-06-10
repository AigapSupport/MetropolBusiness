using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Content;

/// <summary>
/// Ana Sayfa içerik use-case'leri (TODO 1.8, API_CONTRACT §3) — son kullanıcı tarafı.
/// İmplementasyon Infrastructure'dadır (AppDbContext gerektirir; AuthService deseni).
/// Görünürlük kuralları: duyuru = global (TenantId null) + kendi tenant + segment hedefi;
/// anket/video = yalnızca kendi tenant; hepsinde yalnız published içerik listelenir.
/// </summary>
public interface IContentService
{
    /// <summary>GET /home/announcements — firma + global duyurular, segment hedefli, sayfalı.</summary>
    Task<Result<PagedResponse<AnnouncementDto>>> GetAnnouncementsAsync(
        int page, int pageSize, CancellationToken cancellationToken = default);

    /// <summary>GET /home/announcements/{id} — kullanıcıya görünür değilse NOT_FOUND.</summary>
    Task<Result<AnnouncementDto>> GetAnnouncementAsync(
        Guid id, CancellationToken cancellationToken = default);

    /// <summary>GET /home/surveys — yayında olan anketler; completed = yanıt var mı.</summary>
    Task<Result<ItemsResponse<SurveyListItemDto>>> GetSurveysAsync(
        CancellationToken cancellationToken = default);

    /// <summary>GET /home/surveys/{id} — sorularla birlikte; yayında değilse NOT_FOUND.</summary>
    Task<Result<SurveyDetailDto>> GetSurveyAsync(
        Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /home/surveys/{id}/responses — yanıt kaydeder (201).
    /// Tek seferlik ankette ikinci yanıt SURVEY_ALREADY_ANSWERED (409);
    /// tek seferlik olmayanda mevcut yanıtın üzerine yazılır (UNIQUE(survey_id,user_id)).
    /// Soru id'leri ankete ait olmalıdır (VALIDATION_ERROR).
    /// </summary>
    Task<Result<SurveyResponseCreatedDto>> SubmitSurveyResponseAsync(
        Guid surveyId, SurveyResponseRequest request, CancellationToken cancellationToken = default);

    /// <summary>GET /home/videos — kullanıcı bazlı watched/progressSeconds ile.</summary>
    Task<Result<ItemsResponse<VideoDto>>> GetVideosAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /home/videos/{id}/watch — kullanıcı bazlı izleme upsert.
    /// completed=true → Watched=true + WatchedAt damgası (geri alınmaz).
    /// </summary>
    Task<Result<VideoWatchStateDto>> UpsertVideoWatchAsync(
        Guid videoId, VideoWatchRequest request, CancellationToken cancellationToken = default);
}
