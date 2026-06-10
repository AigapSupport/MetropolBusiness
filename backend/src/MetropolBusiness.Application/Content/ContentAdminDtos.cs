namespace MetropolBusiness.Application.Content;

// Firma admin içerik DTO'ları — docs/API_CONTRACT.md §12 "İçerik" uçları.
// Tüm işlemler company_admin rolü ve kendi tenant'ı ile sınırlıdır.

// ── Anketler ────────────────────────────────────────────────────────────────

/// <summary>Admin anket listesi öğesi (GET /admin/company/surveys).</summary>
public sealed record AdminSurveyListItemDto(
    Guid Id,
    string Title,
    string Status,
    bool SingleResponse,
    int QuestionCount,
    int ResponseCount,
    DateTimeOffset? PublishedAt);

/// <summary>Admin anket detayı — sorularla birlikte.</summary>
public sealed record AdminSurveyDetailDto(
    Guid Id,
    string Title,
    string Status,
    bool SingleResponse,
    DateTimeOffset? PublishedAt,
    IReadOnlyList<SurveyQuestionDto> Questions);

/// <summary>Soru oluştur/güncelle: type = "single|multi|text|rating"; options single/multi'de zorunlu.</summary>
public sealed record SurveyQuestionUpsertRequest(
    int Order,
    string Type,
    string Text,
    List<string>? Options);

/// <summary>
/// Anket oluştur/güncelle (sorular nested). Status "draft|published" —
/// yayımla/yayımdan kaldır basit status güncellemesiyle yapılır.
/// </summary>
public sealed record SurveyUpsertRequest(
    string Title,
    bool SingleResponse,
    string Status,
    List<SurveyQuestionUpsertRequest> Questions);

/// <summary>Soru bazında yanıt dağılımı: value → seçilme sayısı (basit sayım).</summary>
public sealed record SurveyQuestionResultDto(
    Guid QuestionId,
    int Order,
    string Type,
    string Text,
    int AnswerCount,
    IReadOnlyDictionary<string, int> Distribution);

/// <summary>Anket sonuçları (GET /admin/company/surveys/{id}/results).</summary>
public sealed record SurveyResultsDto(
    Guid SurveyId,
    string Title,
    int ResponseCount,
    IReadOnlyList<SurveyQuestionResultDto> Questions);

// ── Duyurular ───────────────────────────────────────────────────────────────

/// <summary>Admin duyuru görünümü — segment hedefleriyle (boş liste = tenant'taki herkes).</summary>
public sealed record AdminAnnouncementDto(
    Guid Id,
    string Title,
    string Body,
    string? CoverUrl,
    string Status,
    DateTimeOffset? PublishedAt,
    IReadOnlyList<Guid> SegmentIds);

/// <summary>Duyuru oluştur/güncelle (+ segment hedefleme). SegmentIds null/boş = herkese.</summary>
public sealed record AnnouncementUpsertRequest(
    string Title,
    string Body,
    string? CoverUrl,
    string Status,
    List<Guid>? SegmentIds);

// ── Videolar ────────────────────────────────────────────────────────────────

/// <summary>Admin video görünümü.</summary>
public sealed record AdminVideoDto(
    Guid Id,
    string Title,
    string? Description,
    string Url,
    string? ThumbnailUrl,
    int DurationSeconds,
    bool Mandatory);

/// <summary>Video oluştur/güncelle isteği.</summary>
public sealed record VideoUpsertRequest(
    string Title,
    string? Description,
    string Url,
    string? ThumbnailUrl,
    int DurationSeconds,
    bool Mandatory);

/// <summary>İzleme raporu satırı — kullanıcı bazlı durum (yalnızca kendi tenant kullanıcıları).</summary>
public sealed record VideoWatchReportItemDto(
    Guid UserId,
    string? FirstName,
    string? LastName,
    bool Watched,
    int ProgressSeconds,
    DateTimeOffset? WatchedAt);

/// <summary>İzleme raporu (GET /admin/company/videos/{id}/watch-report).</summary>
public sealed record VideoWatchReportDto(
    Guid VideoId,
    string Title,
    int WatchedCount,
    IReadOnlyList<VideoWatchReportItemDto> Items);
