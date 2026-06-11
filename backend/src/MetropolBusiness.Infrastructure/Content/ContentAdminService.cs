using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Content;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Content;

/// <summary>
/// Firma admin içerik yönetimi (TODO 1.8, API_CONTRACT §12 İçerik).
/// IContentAdminService implementasyonu Infrastructure'dadır (AuthService deseni).
/// DİKKAT: Announcement query filter'ı global (TenantId null) içeriği de gösterir;
/// firma admin yalnızca KENDİ tenant'ının duyurularını yönetebileceği için tüm duyuru
/// sorgularına TenantId == RequiredTenantId koşulu AÇIKÇA eklenir (CLAUDE.md kural 1).
/// </summary>
public sealed class ContentAdminService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    TimeProvider timeProvider)
    : IContentAdminService
{
    private static readonly Error SurveyNotFoundError = new(
        ErrorCodes.NotFound, "Anket bulunamadı.", 404);

    private static readonly Error AnnouncementNotFoundError = new(
        ErrorCodes.NotFound, "Duyuru bulunamadı.", 404);

    private static readonly Error VideoNotFoundError = new(
        ErrorCodes.NotFound, "Video bulunamadı.", 404);

    /// <summary>Admin uçları oturum gerektirir; sub claim'i yoksa policy hatasıdır.</summary>
    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException(
            "Kullanıcı bağlamı yok: bu işlem oturum açmış kullanıcı gerektirir.");

    // ── Anketler ────────────────────────────────────────────────────────────

    public async Task<Result<ItemsResponse<AdminSurveyListItemDto>>> GetSurveysAsync(
        CancellationToken cancellationToken = default)
    {
        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez.
        var rows = await dbContext.Surveys
            .AsNoTracking()
            .Select(s => new
            {
                s.CreatedAt,
                Dto = new AdminSurveyListItemDto(
                    s.Id,
                    s.Title,
                    ContentEnumMapping.StatusToWire(s.Status),
                    s.SingleResponse,
                    s.Questions.Count,
                    s.Responses.Count,
                    s.PublishedAt),
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => r.Dto)
            .ToList();

        return Result<ItemsResponse<AdminSurveyListItemDto>>.Ok(
            new ItemsResponse<AdminSurveyListItemDto>(items));
    }

    public async Task<Result<AdminSurveyDetailDto>> GetSurveyAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var survey = await dbContext.Surveys
            .AsNoTracking()
            .Include(s => s.Questions)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        return survey is null
            ? Result<AdminSurveyDetailDto>.Fail(SurveyNotFoundError)
            : Result<AdminSurveyDetailDto>.Ok(ToSurveyDetailDto(survey));
    }

    public async Task<Result<AdminSurveyDetailDto>> CreateSurveyAsync(
        SurveyUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var parsed = ParseSurveyRequest(request);
        if (!parsed.IsSuccess)
        {
            return Result<AdminSurveyDetailDto>.Fail(parsed.Error!);
        }

        var (status, questions) = parsed.Value;
        var survey = new Survey
        {
            // TenantId, SaveChanges'te bağlamdan otomatik atanır (ITenantOwned).
            Title = request.Title.Trim(),
            SingleResponse = request.SingleResponse,
            Status = status,
            PublishedAt = status == ContentStatus.Published ? timeProvider.GetUtcNow() : null,
            Questions = questions,
        };

        dbContext.Surveys.Add(survey);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AdminSurveyDetailDto>.Ok(ToSurveyDetailDto(survey));
    }

    public async Task<Result<AdminSurveyDetailDto>> UpdateSurveyAsync(
        Guid id, SurveyUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var survey = await dbContext.Surveys
            .Include(s => s.Questions)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (survey is null)
        {
            return Result<AdminSurveyDetailDto>.Fail(SurveyNotFoundError);
        }

        var parsed = ParseSurveyRequest(request);
        if (!parsed.IsSuccess)
        {
            return Result<AdminSurveyDetailDto>.Fail(parsed.Error!);
        }

        var (status, questions) = parsed.Value;
        survey.Title = request.Title.Trim();
        survey.SingleResponse = request.SingleResponse;
        survey.Status = status;
        survey.PublishedAt = status == ContentStatus.Published
            ? survey.PublishedAt ?? timeProvider.GetUtcNow() // yayımla: ilk yayın anı korunur
            : null;                                          // yayımdan kaldır

        // Sorular komple değiştirilir (basit CRUD; soru bazlı diff Faz 3 raporlamada düşünülür).
        dbContext.SurveyQuestions.RemoveRange(survey.Questions);
        survey.Questions = questions;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AdminSurveyDetailDto>.Ok(ToSurveyDetailDto(survey));
    }

    public async Task<Result<bool>> DeleteSurveyAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var survey = await dbContext.Surveys
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (survey is null)
        {
            return Result<bool>.Fail(SurveyNotFoundError);
        }

        dbContext.Surveys.Remove(survey);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<SurveyResultsDto>> GetSurveyResultsAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var survey = await dbContext.Surveys
            .AsNoTracking()
            .Include(s => s.Questions)
            .Include(s => s.Responses)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (survey is null)
        {
            return Result<SurveyResultsDto>.Fail(SurveyNotFoundError);
        }

        // Yanıt JSON'ları soru bazında basit sayıma çevrilir (değer → seçilme sayısı).
        var answersByQuestion = new Dictionary<Guid, Dictionary<string, int>>();
        foreach (var response in survey.Responses)
        {
            foreach (var answer in ParseAnswers(response.AnswersJson))
            {
                if (!answersByQuestion.TryGetValue(answer.QuestionId, out var distribution))
                {
                    distribution = new Dictionary<string, int>();
                    answersByQuestion[answer.QuestionId] = distribution;
                }

                foreach (var value in ExtractAnswerValues(answer.Value))
                {
                    distribution[value] = distribution.GetValueOrDefault(value) + 1;
                }
            }
        }

        var questionResults = survey.Questions
            .OrderBy(q => q.Order)
            .Select(q =>
            {
                var distribution = answersByQuestion.GetValueOrDefault(q.Id)
                    ?? new Dictionary<string, int>();
                return new SurveyQuestionResultDto(
                    q.Id,
                    q.Order,
                    ContentEnumMapping.QuestionTypeToWire(q.Type),
                    q.Text,
                    distribution.Values.Sum(),
                    distribution);
            })
            .ToList();

        return Result<SurveyResultsDto>.Ok(new SurveyResultsDto(
            survey.Id, survey.Title, survey.Responses.Count, questionResults));
    }

    /// <summary>Anket isteğini doğrular: başlık, status sözlüğü, soru tipleri ve seçenekler.</summary>
    private static Result<(ContentStatus Status, List<SurveyQuestion> Questions)> ParseSurveyRequest(
        SurveyUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return Fail("Anket başlığı zorunludur.", new { field = "title" });
        }

        var status = ContentEnumMapping.ParseStatus(request.Status);
        if (status is null)
        {
            return Fail("Geçersiz durum; 'draft' veya 'published' olmalıdır.", new { field = "status" });
        }

        if (request.Questions is null || request.Questions.Count == 0)
        {
            return Fail("Anket en az bir soru içermelidir.", new { field = "questions" });
        }

        var questions = new List<SurveyQuestion>();
        foreach (var question in request.Questions)
        {
            var type = ContentEnumMapping.ParseQuestionType(question.Type);
            if (type is null)
            {
                return Fail(
                    "Geçersiz soru tipi; 'single', 'multi', 'text' veya 'rating' olmalıdır.",
                    new { field = "questions.type" });
            }

            if (string.IsNullOrWhiteSpace(question.Text))
            {
                return Fail("Soru metni zorunludur.", new { field = "questions.text" });
            }

            var hasOptions = question.Options is { Count: > 0 };
            if (type is SurveyQuestionType.Single or SurveyQuestionType.Multi && !hasOptions)
            {
                return Fail(
                    "Tek/çok seçimli sorularda seçenek listesi zorunludur.",
                    new { field = "questions.options" });
            }

            questions.Add(new SurveyQuestion
            {
                Order = question.Order,
                Type = type.Value,
                Text = question.Text.Trim(),
                OptionsJson = hasOptions
                    ? JsonSerializer.Serialize(question.Options)
                    : null,
            });
        }

        return Result<(ContentStatus, List<SurveyQuestion>)>.Ok((status.Value, questions));

        static Result<(ContentStatus, List<SurveyQuestion>)> Fail(string message, object details) =>
            Result<(ContentStatus, List<SurveyQuestion>)>.Fail(
                new Error(ErrorCodes.ValidationError, message, 400, details));
    }

    private static AdminSurveyDetailDto ToSurveyDetailDto(Survey survey) => new(
        survey.Id,
        survey.Title,
        ContentEnumMapping.StatusToWire(survey.Status),
        survey.SingleResponse,
        survey.PublishedAt,
        survey.Questions.OrderBy(q => q.Order).Select(ContentService.ToQuestionDto).ToList());

    private static List<SurveyAnswerDto> ParseAnswers(string answersJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<SurveyAnswerDto>>(
                answersJson, ContentService.JsonWeb) ?? [];
        }
        catch (JsonException)
        {
            // Bozuk yanıt raporu kırmasın; satır sayım dışı bırakılır.
            return [];
        }
    }

    /// <summary>Çoklu seçim dizisi öğe öğe, diğer tipler tek değer olarak sayılır.</summary>
    private static IEnumerable<string> ExtractAnswerValues(JsonElement value) =>
        value.ValueKind == JsonValueKind.Array
            ? value.EnumerateArray().Select(ElementToText)
            : [ElementToText(value)];

    private static string ElementToText(JsonElement element) =>
        element.ValueKind == JsonValueKind.String
            ? element.GetString() ?? string.Empty
            : element.GetRawText();

    // ── Duyurular ───────────────────────────────────────────────────────────

    public async Task<Result<ItemsResponse<AdminAnnouncementDto>>> GetAnnouncementsAsync(
        CancellationToken cancellationToken = default)
    {
        var tenantId = tenantContext.RequiredTenantId;

        var items = await dbContext.Announcements
            .AsNoTracking()
            .Include(a => a.Segments)
            .Where(a => a.TenantId == tenantId) // global içerik admin CRUD'una dahil edilmez
            .ToListAsync(cancellationToken);

        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez.
        return Result<ItemsResponse<AdminAnnouncementDto>>.Ok(
            new ItemsResponse<AdminAnnouncementDto>(
                items
                    .OrderByDescending(a => a.CreatedAt)
                    .Select(ToAnnouncementDto)
                    .ToList()));
    }

    public async Task<Result<AdminAnnouncementDto>> CreateAnnouncementAsync(
        AnnouncementUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var parsed = await ParseAnnouncementRequestAsync(request, cancellationToken);
        if (!parsed.IsSuccess)
        {
            return Result<AdminAnnouncementDto>.Fail(parsed.Error!);
        }

        var (status, segmentIds) = parsed.Value;
        var announcement = new Announcement
        {
            // Announcement ITenantOwned DEĞİL (TenantId nullable) — otomatik atama yok,
            // firma admin içeriği için tenant burada AÇIKÇA atanır.
            TenantId = tenantContext.RequiredTenantId,
            CreatedBy = RequiredUserId,
            Title = request.Title.Trim(),
            Body = request.Body,
            CoverUrl = request.CoverUrl,
            Status = status,
            // İleri tarihli yayım (PANELS_SPEC A.7): verilen tarih yazılır; null = hemen.
            // Home uçları publishedAt <= şimdi olana kadar duyuruyu göstermez.
            PublishedAt = status == ContentStatus.Published
                ? request.PublishedAt ?? timeProvider.GetUtcNow()
                : null,
            Segments = segmentIds
                .Select(segmentId => new AnnouncementSegment { SegmentId = segmentId })
                .ToList(),
        };

        dbContext.Announcements.Add(announcement);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AdminAnnouncementDto>.Ok(ToAnnouncementDto(announcement));
    }

    public async Task<Result<AdminAnnouncementDto>> UpdateAnnouncementAsync(
        Guid id, AnnouncementUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = tenantContext.RequiredTenantId;
        var announcement = await dbContext.Announcements
            .Include(a => a.Segments)
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId, cancellationToken);
        if (announcement is null)
        {
            return Result<AdminAnnouncementDto>.Fail(AnnouncementNotFoundError);
        }

        var parsed = await ParseAnnouncementRequestAsync(request, cancellationToken);
        if (!parsed.IsSuccess)
        {
            return Result<AdminAnnouncementDto>.Fail(parsed.Error!);
        }

        var (status, segmentIds) = parsed.Value;
        announcement.Title = request.Title.Trim();
        announcement.Body = request.Body;
        announcement.CoverUrl = request.CoverUrl;
        announcement.Status = status;
        // İleri tarihli yayım: istekte tarih verildiyse o yazılır (yeniden zamanlama dahil);
        // verilmediyse ilk yayın anı korunur, hiç yoksa şimdi. Yayımdan kaldırınca sıfırlanır.
        announcement.PublishedAt = status == ContentStatus.Published
            ? request.PublishedAt ?? announcement.PublishedAt ?? timeProvider.GetUtcNow()
            : null;

        // Segment hedefleri komple değiştirilir.
        dbContext.AnnouncementSegments.RemoveRange(announcement.Segments);
        announcement.Segments = segmentIds
            .Select(segmentId => new AnnouncementSegment
            {
                AnnouncementId = announcement.Id,
                SegmentId = segmentId,
            })
            .ToList();

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AdminAnnouncementDto>.Ok(ToAnnouncementDto(announcement));
    }

    public async Task<Result<bool>> DeleteAnnouncementAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var tenantId = tenantContext.RequiredTenantId;
        var announcement = await dbContext.Announcements
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tenantId, cancellationToken);
        if (announcement is null)
        {
            return Result<bool>.Fail(AnnouncementNotFoundError);
        }

        dbContext.Announcements.Remove(announcement);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<bool>.Ok(true);
    }

    /// <summary>Duyuru isteğini doğrular; hedef segmentlerin tenant'a aitliği kontrol edilir.</summary>
    private async Task<Result<(ContentStatus Status, List<Guid> SegmentIds)>> ParseAnnouncementRequestAsync(
        AnnouncementUpsertRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return Fail("Duyuru başlığı zorunludur.", new { field = "title" });
        }

        if (string.IsNullOrWhiteSpace(request.Body))
        {
            return Fail("Duyuru içeriği zorunludur.", new { field = "body" });
        }

        var status = ContentEnumMapping.ParseStatus(request.Status);
        if (status is null)
        {
            return Fail("Geçersiz durum; 'draft' veya 'published' olmalıdır.", new { field = "status" });
        }

        var segmentIds = (request.SegmentIds ?? []).Distinct().ToList();
        if (segmentIds.Count > 0)
        {
            // Segments query filter'ı tenant'a kapalıdır: başka tenant'ın segment id'si bulunamaz.
            var validCount = await dbContext.Segments
                .AsNoTracking()
                .CountAsync(s => segmentIds.Contains(s.Id), cancellationToken);
            if (validCount != segmentIds.Count)
            {
                return Fail(
                    "Hedef segmentlerden bazıları bulunamadı.",
                    new { field = "segmentIds" });
            }
        }

        return Result<(ContentStatus, List<Guid>)>.Ok((status.Value, segmentIds));

        static Result<(ContentStatus, List<Guid>)> Fail(string message, object details) =>
            Result<(ContentStatus, List<Guid>)>.Fail(
                new Error(ErrorCodes.ValidationError, message, 400, details));
    }

    private static AdminAnnouncementDto ToAnnouncementDto(Announcement announcement) => new(
        announcement.Id,
        announcement.Title,
        announcement.Body,
        announcement.CoverUrl,
        ContentEnumMapping.StatusToWire(announcement.Status),
        announcement.PublishedAt,
        announcement.Segments.Select(s => s.SegmentId).ToList());

    // ── Videolar ────────────────────────────────────────────────────────────

    public async Task<Result<ItemsResponse<AdminVideoDto>>> GetVideosAsync(
        CancellationToken cancellationToken = default)
    {
        var videos = await dbContext.Videos
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez.
        var items = videos
            .OrderByDescending(v => v.CreatedAt)
            .Select(ToVideoDto)
            .ToList();

        return Result<ItemsResponse<AdminVideoDto>>.Ok(new ItemsResponse<AdminVideoDto>(items));
    }

    public async Task<Result<AdminVideoDto>> CreateVideoAsync(
        VideoUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = ValidateVideoRequest(request);
        if (validationError is not null)
        {
            return Result<AdminVideoDto>.Fail(validationError);
        }

        var video = new Video
        {
            // TenantId, SaveChanges'te bağlamdan otomatik atanır (ITenantOwned).
            Title = request.Title.Trim(),
            Description = request.Description,
            Url = request.Url.Trim(),
            ThumbnailUrl = request.ThumbnailUrl,
            DurationSeconds = request.DurationSeconds,
            Mandatory = request.Mandatory,
        };

        dbContext.Videos.Add(video);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AdminVideoDto>.Ok(ToVideoDto(video));
    }

    public async Task<Result<AdminVideoDto>> UpdateVideoAsync(
        Guid id, VideoUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var video = await dbContext.Videos
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (video is null)
        {
            return Result<AdminVideoDto>.Fail(VideoNotFoundError);
        }

        var validationError = ValidateVideoRequest(request);
        if (validationError is not null)
        {
            return Result<AdminVideoDto>.Fail(validationError);
        }

        video.Title = request.Title.Trim();
        video.Description = request.Description;
        video.Url = request.Url.Trim();
        video.ThumbnailUrl = request.ThumbnailUrl;
        video.DurationSeconds = request.DurationSeconds;
        video.Mandatory = request.Mandatory;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AdminVideoDto>.Ok(ToVideoDto(video));
    }

    public async Task<Result<bool>> DeleteVideoAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var video = await dbContext.Videos
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (video is null)
        {
            return Result<bool>.Fail(VideoNotFoundError);
        }

        dbContext.Videos.Remove(video);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<VideoWatchReportDto>> GetVideoWatchReportAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var video = await dbContext.Videos
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (video is null)
        {
            return Result<VideoWatchReportDto>.Fail(VideoNotFoundError);
        }

        // Kullanıcı bazlı izleme listesi — yalnızca ad/soyad (PII minimum, CLAUDE.md §8).
        // Sıralama bellekte: DateTimeOffset ORDER BY SQLite'ta (test) desteklenmez.
        var rows = await dbContext.VideoWatches
            .AsNoTracking()
            .Where(w => w.VideoId == id)
            .Select(w => new VideoWatchReportItemDto(
                w.UserId,
                w.User!.FirstName,
                w.User.LastName,
                w.Watched,
                w.ProgressSeconds,
                w.WatchedAt))
            .ToListAsync(cancellationToken);

        var items = rows
            .OrderByDescending(i => i.WatchedAt)
            .ToList();

        return Result<VideoWatchReportDto>.Ok(new VideoWatchReportDto(
            video.Id,
            video.Title,
            items.Count(i => i.Watched),
            items));
    }

    private static Error? ValidateVideoRequest(VideoUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return new Error(
                ErrorCodes.ValidationError, "Video başlığı zorunludur.", 400, new { field = "title" });
        }

        if (string.IsNullOrWhiteSpace(request.Url))
        {
            return new Error(
                ErrorCodes.ValidationError, "Video adresi zorunludur.", 400, new { field = "url" });
        }

        if (request.DurationSeconds < 0)
        {
            return new Error(
                ErrorCodes.ValidationError,
                "Video süresi negatif olamaz.",
                400,
                new { field = "durationSeconds" });
        }

        return null;
    }

    private static AdminVideoDto ToVideoDto(Video video) => new(
        video.Id,
        video.Title,
        video.Description,
        video.Url,
        video.ThumbnailUrl,
        video.DurationSeconds,
        video.Mandatory);
}
