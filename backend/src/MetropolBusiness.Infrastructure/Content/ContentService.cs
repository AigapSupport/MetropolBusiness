using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Content;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Content;

/// <summary>
/// Ana Sayfa içerik servisi (TODO 1.8, API_CONTRACT §3) — son kullanıcı tarafı.
/// IContentService implementasyonu Infrastructure'dadır çünkü AppDbContext gerektirir
/// (AuthService ile aynı desen; katman yönü: Api → Application → Domain).
/// Tenant izolasyonu AppDbContext global query filter'larıyla sağlanır:
/// duyuruda (TenantId == null || TenantId == aktif tenant), anket/videoda kendi tenant.
/// </summary>
public sealed class ContentService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    TimeProvider timeProvider) : IContentService
{
    /// <summary>AnswersJson sözleşme ile aynı biçimde (camelCase) saklanır.</summary>
    internal static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);

    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private static readonly Error AnnouncementNotFoundError = new(
        ErrorCodes.NotFound, "Duyuru bulunamadı.", 404);

    private static readonly Error SurveyNotFoundError = new(
        ErrorCodes.NotFound, "Anket bulunamadı.", 404);

    private static readonly Error VideoNotFoundError = new(
        ErrorCodes.NotFound, "Video bulunamadı.", 404);

    private static readonly Error SurveyAlreadyAnsweredError = new(
        ErrorCodes.SurveyAlreadyAnswered, "Bu anketi daha önce yanıtladınız.", 409);

    /// <summary>İçerik uçları oturum gerektirir; sub claim'i yoksa programlama/policy hatasıdır.</summary>
    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException(
            "Kullanıcı bağlamı yok: bu işlem oturum açmış kullanıcı gerektirir.");

    // ── Duyurular ───────────────────────────────────────────────────────────

    public async Task<Result<PagedResponse<AnnouncementDto>>> GetAnnouncementsAsync(
        int page, int pageSize, CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            page = 1;
        }

        if (pageSize < 1 || pageSize > MaxPageSize)
        {
            pageSize = DefaultPageSize;
        }

        var query = await BuildVisibleAnnouncementsQueryAsync(cancellationToken);

        // Sıralama+sayfalama+yayım zamanı filtresi bellekte: DateTimeOffset ORDER BY ve
        // karşılaştırma SQLite'ta (test) desteklenmez, duyuru kümesi tenant başına küçüktür
        // (Faz 3 performans turunda gözden geçirilir).
        // İleri tarihli yayım (PANELS_SPEC A.7): YALNIZCA publishedAt <= şimdi olanlar döner;
        // zaman TimeProvider'dan okunur (test edilebilirlik — sabit saatle doğrulanır).
        var now = timeProvider.GetUtcNow();
        var visible = (await query.ToListAsync(cancellationToken))
            .Where(a => a.PublishedAt is not null && a.PublishedAt <= now)
            .ToList();
        var items = visible
            .OrderByDescending(a => a.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ToAnnouncementDto)
            .ToList();

        return Result<PagedResponse<AnnouncementDto>>.Ok(
            new PagedResponse<AnnouncementDto>(items, page, pageSize, visible.Count));
    }

    public async Task<Result<AnnouncementDto>> GetAnnouncementAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var query = await BuildVisibleAnnouncementsQueryAsync(cancellationToken);
        var announcement = await query.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        // İleri tarihli yayım: zamanı gelmemiş duyuru detay ucundan da SIZMAZ (NOT_FOUND).
        // Karşılaştırma bellekte — DateTimeOffset karşılaştırması SQLite'ta (test) çevrilemez.
        if (announcement is null
            || announcement.PublishedAt is null
            || announcement.PublishedAt > timeProvider.GetUtcNow())
        {
            return Result<AnnouncementDto>.Fail(AnnouncementNotFoundError);
        }

        return Result<AnnouncementDto>.Ok(ToAnnouncementDto(announcement));
    }

    /// <summary>
    /// Görünürlük: yayında + (hedef segment boşsa herkese, doluysa kullanıcının
    /// segmentlerinden en az biri hedefte). Global/firma ayrımı query filter'da.
    /// </summary>
    private async Task<IQueryable<Announcement>> BuildVisibleAnnouncementsQueryAsync(
        CancellationToken cancellationToken)
    {
        var userId = RequiredUserId;
        var userSegmentIds = await dbContext.UserSegments
            .AsNoTracking()
            .Where(us => us.UserId == userId)
            .Select(us => us.SegmentId)
            .ToListAsync(cancellationToken);

        return dbContext.Announcements
            .AsNoTracking()
            .Where(a => a.Status == ContentStatus.Published)
            .Where(a => !a.Segments.Any()
                || a.Segments.Any(s => userSegmentIds.Contains(s.SegmentId)));
    }

    private static AnnouncementDto ToAnnouncementDto(Announcement announcement) => new(
        announcement.Id,
        announcement.Title,
        announcement.Body,
        announcement.CoverUrl,
        announcement.TenantId == null ? "platform" : "company",
        announcement.PublishedAt);

    // ── Anketler ────────────────────────────────────────────────────────────

    public async Task<Result<ItemsResponse<SurveyListItemDto>>> GetSurveysAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez.
        var rows = await dbContext.Surveys
            .AsNoTracking()
            .Where(s => s.Status == ContentStatus.Published)
            .Select(s => new
            {
                s.PublishedAt,
                Dto = new SurveyListItemDto(
                    s.Id,
                    s.Title,
                    s.Questions.Count,
                    s.Responses.Any(r => r.UserId == userId),
                    s.SingleResponse),
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .OrderByDescending(r => r.PublishedAt)
            .Select(r => r.Dto)
            .ToList();

        return Result<ItemsResponse<SurveyListItemDto>>.Ok(
            new ItemsResponse<SurveyListItemDto>(items));
    }

    public async Task<Result<SurveyDetailDto>> GetSurveyAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var survey = await dbContext.Surveys
            .AsNoTracking()
            .Include(s => s.Questions)
            .FirstOrDefaultAsync(
                s => s.Id == id && s.Status == ContentStatus.Published, cancellationToken);

        if (survey is null)
        {
            return Result<SurveyDetailDto>.Fail(SurveyNotFoundError);
        }

        var questions = survey.Questions
            .OrderBy(q => q.Order)
            .Select(ToQuestionDto)
            .ToList();

        return Result<SurveyDetailDto>.Ok(
            new SurveyDetailDto(survey.Id, survey.Title, survey.SingleResponse, questions));
    }

    public async Task<Result<SurveyResponseCreatedDto>> SubmitSurveyResponseAsync(
        Guid surveyId, SurveyResponseRequest request, CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // Başka tenant'ın anketi query filter sayesinde görünmez → NOT_FOUND (sızıntı yok).
        var survey = await dbContext.Surveys
            .AsNoTracking()
            .Include(s => s.Questions)
            .FirstOrDefaultAsync(
                s => s.Id == surveyId && s.Status == ContentStatus.Published, cancellationToken);

        if (survey is null)
        {
            return Result<SurveyResponseCreatedDto>.Fail(SurveyNotFoundError);
        }

        var validationError = ValidateAnswers(survey, request);
        if (validationError is not null)
        {
            return Result<SurveyResponseCreatedDto>.Fail(validationError);
        }

        var existing = await dbContext.SurveyResponses
            .FirstOrDefaultAsync(
                r => r.SurveyId == surveyId && r.UserId == userId, cancellationToken);

        if (existing is not null && survey.SingleResponse)
        {
            return Result<SurveyResponseCreatedDto>.Fail(SurveyAlreadyAnsweredError);
        }

        var answersJson = JsonSerializer.Serialize(request.Answers, JsonWeb);

        if (existing is not null)
        {
            // Tek seferlik olmayan anket: UNIQUE(survey_id, user_id) gereği üzerine yazılır.
            existing.AnswersJson = answersJson;
            await dbContext.SaveChangesAsync(cancellationToken);
            return Result<SurveyResponseCreatedDto>.Ok(
                new SurveyResponseCreatedDto(existing.Id, surveyId, existing.CreatedAt));
        }

        var response = new SurveyResponse
        {
            SurveyId = surveyId,
            UserId = userId,
            AnswersJson = answersJson,
        };
        dbContext.SurveyResponses.Add(response);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<SurveyResponseCreatedDto>.Ok(
            new SurveyResponseCreatedDto(response.Id, surveyId, response.CreatedAt));
    }

    /// <summary>Yanıt doğrulaması: boş olamaz, soru id'leri ankete ait ve tekil olmalı.</summary>
    private static Error? ValidateAnswers(Survey survey, SurveyResponseRequest request)
    {
        if (request.Answers is null || request.Answers.Count == 0)
        {
            return new Error(
                ErrorCodes.ValidationError,
                "En az bir yanıt gönderilmelidir.",
                400,
                new { field = "answers" });
        }

        var questionIds = survey.Questions.Select(q => q.Id).ToHashSet();
        var unknownIds = request.Answers
            .Select(a => a.QuestionId)
            .Where(id => !questionIds.Contains(id))
            .Distinct()
            .ToList();
        if (unknownIds.Count > 0)
        {
            return new Error(
                ErrorCodes.ValidationError,
                "Yanıtlar bu ankete ait olmayan soru içeriyor.",
                400,
                new { unknownQuestionIds = unknownIds });
        }

        if (request.Answers.Select(a => a.QuestionId).Distinct().Count() != request.Answers.Count)
        {
            return new Error(
                ErrorCodes.ValidationError,
                "Aynı soruya birden fazla yanıt gönderilemez.",
                400,
                new { field = "answers" });
        }

        return null;
    }

    internal static SurveyQuestionDto ToQuestionDto(SurveyQuestion question) => new(
        question.Id,
        question.Order,
        ContentEnumMapping.QuestionTypeToWire(question.Type),
        question.Text,
        ParseOptions(question.OptionsJson));

    internal static IReadOnlyList<string> ParseOptions(string? optionsJson)
    {
        if (string.IsNullOrWhiteSpace(optionsJson))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(optionsJson) ?? [];
        }
        catch (JsonException)
        {
            // Bozuk veri kullanıcı akışını kırmasın; boş seçenek listesiyle devam edilir.
            return [];
        }
    }

    // ── Videolar ────────────────────────────────────────────────────────────

    public async Task<Result<ItemsResponse<VideoDto>>> GetVideosAsync(
        CancellationToken cancellationToken = default)
    {
        var userId = RequiredUserId;

        // watched/progressSeconds isteyen KULLANICIYA özeldir (TODO 1.8: kullanıcı bazlı durum).
        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez.
        var rows = await dbContext.Videos
            .AsNoTracking()
            .Select(v => new
            {
                v.CreatedAt,
                Dto = new VideoDto(
                    v.Id,
                    v.Title,
                    v.Description,
                    v.Url,
                    v.ThumbnailUrl,
                    v.DurationSeconds,
                    v.Mandatory,
                    v.Watches.Any(w => w.UserId == userId && w.Watched),
                    v.Watches.Where(w => w.UserId == userId)
                        .Select(w => w.ProgressSeconds)
                        .FirstOrDefault()),
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => r.Dto)
            .ToList();

        return Result<ItemsResponse<VideoDto>>.Ok(new ItemsResponse<VideoDto>(items));
    }

    public async Task<Result<VideoWatchStateDto>> UpsertVideoWatchAsync(
        Guid videoId, VideoWatchRequest request, CancellationToken cancellationToken = default)
    {
        if (request.ProgressSeconds < 0)
        {
            return Result<VideoWatchStateDto>.Fail(new Error(
                ErrorCodes.ValidationError,
                "İlerleme süresi negatif olamaz.",
                400,
                new { field = "progressSeconds" }));
        }

        var videoExists = await dbContext.Videos
            .AsNoTracking()
            .AnyAsync(v => v.Id == videoId, cancellationToken);
        if (!videoExists)
        {
            return Result<VideoWatchStateDto>.Fail(VideoNotFoundError);
        }

        var userId = RequiredUserId;
        var watch = await dbContext.VideoWatches
            .FirstOrDefaultAsync(
                w => w.VideoId == videoId && w.UserId == userId, cancellationToken);

        if (watch is null)
        {
            watch = new VideoWatch { VideoId = videoId, UserId = userId };
            dbContext.VideoWatches.Add(watch);
        }

        watch.ProgressSeconds = request.ProgressSeconds;
        if (request.Completed && !watch.Watched)
        {
            // completed=true → izlendi işareti + damga; bir kez izlendiyse geri alınmaz.
            watch.Watched = true;
            watch.WatchedAt = timeProvider.GetUtcNow();
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<VideoWatchStateDto>.Ok(new VideoWatchStateDto(
            videoId, watch.Watched, watch.ProgressSeconds, watch.WatchedAt));
    }
}
