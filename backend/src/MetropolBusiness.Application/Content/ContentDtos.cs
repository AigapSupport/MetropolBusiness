using System.Text.Json;

namespace MetropolBusiness.Application.Content;

// Ana Sayfa içerik DTO'ları — docs/API_CONTRACT.md §3 alanlarıyla birebir.
// JSON serileştirme ASP.NET Core varsayılanıyla otomatik camelCase'dir.

/// <summary>Duyuru (GET /home/announcements): source = "company" (firma) | "platform" (global).</summary>
public sealed record AnnouncementDto(
    Guid Id,
    string Title,
    string Body,
    string? CoverUrl,
    string Source,
    DateTimeOffset? PublishedAt);

/// <summary>Anket liste öğesi (GET /home/surveys): completed = kullanıcının yanıtı var mı.</summary>
public sealed record SurveyListItemDto(
    Guid Id,
    string Title,
    int QuestionCount,
    bool Completed,
    bool SingleResponse);

/// <summary>Anket sorusu: type = "single|multi|text|rating"; options text/rating'de boş dizi.</summary>
public sealed record SurveyQuestionDto(
    Guid Id,
    int Order,
    string Type,
    string Text,
    IReadOnlyList<string> Options);

/// <summary>Anket detayı (GET /home/surveys/{id}) — sorularla birlikte.</summary>
public sealed record SurveyDetailDto(
    Guid Id,
    string Title,
    bool SingleResponse,
    IReadOnlyList<SurveyQuestionDto> Questions);

/// <summary>Tek yanıt: value tek seçim/metin/puanda string-sayı, çoklu seçimde dizi olabilir.</summary>
public sealed record SurveyAnswerDto(Guid QuestionId, JsonElement Value);

/// <summary>POST /home/surveys/{id}/responses isteği: { answers: [{ questionId, value }] }.</summary>
public sealed record SurveyResponseRequest(List<SurveyAnswerDto> Answers);

/// <summary>Anket yanıtı oluşturuldu (201) yanıtı.</summary>
public sealed record SurveyResponseCreatedDto(Guid Id, Guid SurveyId, DateTimeOffset CreatedAt);

/// <summary>Video (GET /home/videos): watched/progressSeconds isteyen kullanıcıya özeldir.</summary>
public sealed record VideoDto(
    Guid Id,
    string Title,
    string? Description,
    string Url,
    string? ThumbnailUrl,
    int DurationSeconds,
    bool Mandatory,
    bool Watched,
    int ProgressSeconds);

/// <summary>POST /home/videos/{id}/watch isteği: { progressSeconds, completed }.</summary>
public sealed record VideoWatchRequest(int ProgressSeconds, bool Completed);

/// <summary>İzleme durumu yanıtı (200 güncel durum).</summary>
public sealed record VideoWatchStateDto(
    Guid VideoId,
    bool Watched,
    int ProgressSeconds,
    DateTimeOffset? WatchedAt);
