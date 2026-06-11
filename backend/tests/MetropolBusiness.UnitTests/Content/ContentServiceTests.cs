using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Content;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Content;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.UnitTests.Content;

/// <summary>
/// Ana Sayfa içerik senaryoları (TODO 1.8, API_CONTRACT §3/§12):
/// global+firma duyuru ayrımı, segment hedefleme, tek seferlik anket kilidi,
/// completed bayrağı, video izleme upsert (kullanıcı bazlı), tenant izolasyonu.
/// SQLite in-memory AppDbContext (TenantIsolationTests/AuthServiceTests deseni).
/// </summary>
public sealed class ContentServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly SqliteConnection _connection;

    private readonly Guid _userA1 = Guid.NewGuid(); // tenant A, segmentsiz
    private readonly Guid _userA2 = Guid.NewGuid(); // tenant A, "Yönetim" segmentinde
    private readonly Guid _userB1 = Guid.NewGuid(); // tenant B

    private readonly Guid _segmentYonetimA = Guid.NewGuid(); // tenant A
    private readonly Guid _segmentB = Guid.NewGuid();        // tenant B

    private readonly Guid _globalAnnouncement = Guid.NewGuid();   // TenantId = null (platform)
    private readonly Guid _companyAnnouncementA = Guid.NewGuid();
    private readonly Guid _companyAnnouncementB = Guid.NewGuid();
    private readonly Guid _segmentAnnouncementA = Guid.NewGuid(); // yalnız Yönetim segmentine
    private readonly Guid _draftAnnouncementA = Guid.NewGuid();

    private readonly Guid _surveySingleA = Guid.NewGuid(); // tek seferlik, yayında
    private readonly Guid _surveyMultiA = Guid.NewGuid();  // tek seferlik DEĞİL, yayında
    private readonly Guid _surveyB = Guid.NewGuid();       // tenant B anketi
    private readonly Guid _draftSurveyA = Guid.NewGuid();

    private readonly Guid _questionSingleA = Guid.NewGuid();
    private readonly Guid _questionTextA = Guid.NewGuid();
    private readonly Guid _questionMultiA = Guid.NewGuid();
    private readonly Guid _questionB = Guid.NewGuid();

    private readonly Guid _videoA = Guid.NewGuid();
    private readonly Guid _videoB = Guid.NewGuid();

    public ContentServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "Firma A", Code = "A", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "Firma B", Code = "B", Status = TenantStatus.Active });

        seed.Users.AddRange(
            new User { Id = _userA1, TenantId = TenantA, Phone = "5550000001", FirstName = "Ali" },
            new User { Id = _userA2, TenantId = TenantA, Phone = "5550000002", FirstName = "Ayşe" },
            new User { Id = _userB1, TenantId = TenantB, Phone = "5550000003", FirstName = "Burak" });

        seed.Segments.AddRange(
            new Segment { Id = _segmentYonetimA, TenantId = TenantA, Name = "Yönetim" },
            new Segment { Id = _segmentB, TenantId = TenantB, Name = "Tüm Çalışanlar" });

        seed.UserSegments.Add(new UserSegment { UserId = _userA2, SegmentId = _segmentYonetimA });

        var now = DateTimeOffset.UtcNow;
        seed.Announcements.AddRange(
            new Announcement
            {
                Id = _globalAnnouncement,
                TenantId = null, // platform/global içerik — herkese görünür
                Title = "Global Duyuru",
                Body = "Tüm firmalara.",
                Status = ContentStatus.Published,
                PublishedAt = now.AddDays(-3),
                CreatedBy = Guid.NewGuid(),
            },
            new Announcement
            {
                Id = _companyAnnouncementA,
                TenantId = TenantA,
                Title = "A Duyurusu",
                Body = "Yalnız A firmasına.",
                Status = ContentStatus.Published,
                PublishedAt = now.AddDays(-2),
                CreatedBy = _userA2,
            },
            new Announcement
            {
                Id = _companyAnnouncementB,
                TenantId = TenantB,
                Title = "B Duyurusu",
                Body = "Yalnız B firmasına.",
                Status = ContentStatus.Published,
                PublishedAt = now.AddDays(-2),
                CreatedBy = _userB1,
            },
            new Announcement
            {
                Id = _segmentAnnouncementA,
                TenantId = TenantA,
                Title = "Yönetim Duyurusu",
                Body = "Yalnız Yönetim segmentine.",
                Status = ContentStatus.Published,
                PublishedAt = now.AddDays(-1),
                CreatedBy = _userA2,
                Segments = { new AnnouncementSegment { SegmentId = _segmentYonetimA } },
            },
            new Announcement
            {
                Id = _draftAnnouncementA,
                TenantId = TenantA,
                Title = "Taslak Duyuru",
                Body = "Henüz yayında değil.",
                Status = ContentStatus.Draft,
                CreatedBy = _userA2,
            });

        seed.Surveys.AddRange(
            new Survey
            {
                Id = _surveySingleA,
                TenantId = TenantA,
                Title = "Memnuniyet Anketi",
                Status = ContentStatus.Published,
                SingleResponse = true,
                PublishedAt = now.AddDays(-1),
                Questions =
                {
                    new SurveyQuestion
                    {
                        Id = _questionSingleA,
                        Order = 1,
                        Type = SurveyQuestionType.Single,
                        Text = "Memnun musunuz?",
                        OptionsJson = """["Evet","Hayır"]""",
                    },
                    new SurveyQuestion
                    {
                        Id = _questionTextA,
                        Order = 2,
                        Type = SurveyQuestionType.Text,
                        Text = "Görüşünüz?",
                    },
                },
            },
            new Survey
            {
                Id = _surveyMultiA,
                TenantId = TenantA,
                Title = "Tekrarlı Anket",
                Status = ContentStatus.Published,
                SingleResponse = false,
                PublishedAt = now.AddDays(-1),
                Questions =
                {
                    new SurveyQuestion
                    {
                        Id = _questionMultiA,
                        Order = 1,
                        Type = SurveyQuestionType.Multi,
                        Text = "Hangileri?",
                        OptionsJson = """["A","B","C"]""",
                    },
                },
            },
            new Survey
            {
                Id = _surveyB,
                TenantId = TenantB,
                Title = "B Anketi",
                Status = ContentStatus.Published,
                SingleResponse = true,
                PublishedAt = now.AddDays(-1),
                Questions =
                {
                    new SurveyQuestion
                    {
                        Id = _questionB,
                        Order = 1,
                        Type = SurveyQuestionType.Single,
                        Text = "B sorusu?",
                        OptionsJson = """["X","Y"]""",
                    },
                },
            },
            new Survey
            {
                Id = _draftSurveyA,
                TenantId = TenantA,
                Title = "Taslak Anket",
                Status = ContentStatus.Draft,
                SingleResponse = true,
            });

        seed.Videos.AddRange(
            new Video
            {
                Id = _videoA,
                TenantId = TenantA,
                Title = "Oryantasyon",
                Url = "https://cdn.example.com/a.mp4",
                DurationSeconds = 300,
                Mandatory = true,
            },
            new Video
            {
                Id = _videoB,
                TenantId = TenantB,
                Title = "B Eğitimi",
                Url = "https://cdn.example.com/b.mp4",
                DurationSeconds = 120,
                Mandatory = false,
            });

        seed.SaveChanges();
    }

    // ── (a) Duyurular: global + firma birlikte, başka tenant'ınki asla ──────

    [Fact]
    public async Task Announcements_include_global_and_own_company_but_not_other_tenant()
    {
        var service = CreateContentService(TenantA, _userA1);

        var result = await service.GetAnnouncementsAsync(1, 20);

        Assert.True(result.IsSuccess);
        var items = result.Value.Items;
        Assert.Contains(items, a => a.Id == _globalAnnouncement && a.Source == "platform");
        Assert.Contains(items, a => a.Id == _companyAnnouncementA && a.Source == "company");
        Assert.DoesNotContain(items, a => a.Id == _companyAnnouncementB); // tenant izolasyonu
        Assert.DoesNotContain(items, a => a.Id == _draftAnnouncementA);   // taslak listelenmez
        Assert.Equal(2, result.Value.Total);
    }

    // ── (b) Segment hedefli duyuru yalnız o segmentteki kullanıcıya ──────────

    [Fact]
    public async Task Segment_targeted_announcement_visible_only_to_segment_member()
    {
        var memberService = CreateContentService(TenantA, _userA2);  // Yönetim segmentinde
        var outsiderService = CreateContentService(TenantA, _userA1); // segmentsiz

        var memberResult = await memberService.GetAnnouncementsAsync(1, 20);
        var outsiderResult = await outsiderService.GetAnnouncementsAsync(1, 20);

        Assert.Contains(memberResult.Value.Items, a => a.Id == _segmentAnnouncementA);
        Assert.DoesNotContain(outsiderResult.Value.Items, a => a.Id == _segmentAnnouncementA);

        // Detay ucu da aynı görünürlük kuralını uygular.
        var outsiderDetail = await outsiderService.GetAnnouncementAsync(_segmentAnnouncementA);
        Assert.False(outsiderDetail.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, outsiderDetail.Error!.Code);
    }

    // ── (c) Tek seferlik ankette ikinci yanıt 409 ────────────────────────────

    [Fact]
    public async Task Single_response_survey_rejects_second_answer_with_conflict()
    {
        var service = CreateContentService(TenantA, _userA1);
        var request = BuildAnswers((_questionSingleA, "Evet"), (_questionTextA, "Güzel."));

        var first = await service.SubmitSurveyResponseAsync(_surveySingleA, request);
        Assert.True(first.IsSuccess);

        var second = await service.SubmitSurveyResponseAsync(_surveySingleA, request);
        Assert.False(second.IsSuccess);
        Assert.Equal(ErrorCodes.SurveyAlreadyAnswered, second.Error!.Code);
        Assert.Equal(409, second.Error!.HttpStatus);
    }

    // ── (d) Anket completed bayrağı kullanıcı bazlıdır ───────────────────────

    [Fact]
    public async Task Survey_completed_flag_reflects_only_current_users_response()
    {
        var answering = CreateContentService(TenantA, _userA1);
        await answering.SubmitSurveyResponseAsync(
            _surveySingleA, BuildAnswers((_questionSingleA, "Evet")));

        var answeredList = await CreateContentService(TenantA, _userA1).GetSurveysAsync();
        var otherUserList = await CreateContentService(TenantA, _userA2).GetSurveysAsync();

        Assert.True(answeredList.Value.Items.Single(s => s.Id == _surveySingleA).Completed);
        Assert.False(answeredList.Value.Items.Single(s => s.Id == _surveyMultiA).Completed);
        Assert.False(otherUserList.Value.Items.Single(s => s.Id == _surveySingleA).Completed);

        // Taslak anket ve başka tenant'ın anketi listelenmez.
        Assert.DoesNotContain(answeredList.Value.Items, s => s.Id == _draftSurveyA);
        Assert.DoesNotContain(answeredList.Value.Items, s => s.Id == _surveyB);
    }

    // ── (e) Video izleme upsert + kullanıcı bazlı durum ─────────────────────

    [Fact]
    public async Task Video_watch_is_upserted_per_user()
    {
        var serviceA1 = CreateContentService(TenantA, _userA1);

        var progress = await serviceA1.UpsertVideoWatchAsync(
            _videoA, new VideoWatchRequest(ProgressSeconds: 30, Completed: false));
        Assert.True(progress.IsSuccess);
        Assert.False(progress.Value.Watched);
        Assert.Equal(30, progress.Value.ProgressSeconds);

        var completed = await serviceA1.UpsertVideoWatchAsync(
            _videoA, new VideoWatchRequest(ProgressSeconds: 300, Completed: true));
        Assert.True(completed.Value.Watched);
        Assert.NotNull(completed.Value.WatchedAt);

        // Upsert: aynı kullanıcı+video için tek satır kalır.
        using (var verify = CreateContext(TenantA, _userA1))
        {
            Assert.Equal(1, verify.VideoWatches.Count(w => w.VideoId == _videoA));
        }

        // İki kullanıcı ayrı durum taşır: A2 hâlâ izlemedi görünür.
        var listForA1 = await CreateContentService(TenantA, _userA1).GetVideosAsync();
        var listForA2 = await CreateContentService(TenantA, _userA2).GetVideosAsync();

        var videoForA1 = listForA1.Value.Items.Single(v => v.Id == _videoA);
        var videoForA2 = listForA2.Value.Items.Single(v => v.Id == _videoA);
        Assert.True(videoForA1.Watched);
        Assert.Equal(300, videoForA1.ProgressSeconds);
        Assert.False(videoForA2.Watched);
        Assert.Equal(0, videoForA2.ProgressSeconds);

        // Başka tenant'ın videosu listede yoktur (tenant izolasyonu).
        Assert.DoesNotContain(listForA1.Value.Items, v => v.Id == _videoB);
    }

    // ── (f) Başka tenant'ın anketine yanıt NOT_FOUND ─────────────────────────

    [Fact]
    public async Task Responding_to_other_tenants_survey_returns_not_found()
    {
        var service = CreateContentService(TenantA, _userA1);

        var result = await service.SubmitSurveyResponseAsync(
            _surveyB, BuildAnswers((_questionB, "X")));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
        Assert.Equal(404, result.Error!.HttpStatus);
    }

    // ── Diğer kurallar ───────────────────────────────────────────────────────

    [Fact]
    public async Task Answer_with_foreign_question_id_is_validation_error()
    {
        var service = CreateContentService(TenantA, _userA1);

        // _questionB başka anketin sorusudur — bu ankete ait değildir.
        var result = await service.SubmitSurveyResponseAsync(
            _surveySingleA, BuildAnswers((_questionB, "Evet")));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
    }

    [Fact]
    public async Task Non_single_response_survey_overwrites_previous_answer()
    {
        var service = CreateContentService(TenantA, _userA1);

        var first = await service.SubmitSurveyResponseAsync(
            _surveyMultiA, BuildAnswers((_questionMultiA, "A")));
        var second = await service.SubmitSurveyResponseAsync(
            _surveyMultiA, BuildAnswers((_questionMultiA, "B")));

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);

        // UNIQUE(survey_id, user_id): üzerine yazılır, ikinci satır açılmaz.
        using var verify = CreateContext(TenantA, _userA1);
        var response = verify.SurveyResponses.Single(
            r => r.SurveyId == _surveyMultiA && r.UserId == _userA1);
        Assert.Contains("\"B\"", response.AnswersJson);
    }

    [Fact]
    public async Task Watching_other_tenants_video_returns_not_found()
    {
        var service = CreateContentService(TenantA, _userA1);

        var result = await service.UpsertVideoWatchAsync(
            _videoB, new VideoWatchRequest(ProgressSeconds: 10, Completed: false));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
    }

    [Fact]
    public async Task Survey_detail_returns_ordered_questions_with_options()
    {
        var service = CreateContentService(TenantA, _userA1);

        var result = await service.GetSurveyAsync(_surveySingleA);

        Assert.True(result.IsSuccess);
        var detail = result.Value;
        Assert.Equal(2, detail.Questions.Count);
        Assert.Equal("single", detail.Questions[0].Type);
        Assert.Equal(new[] { "Evet", "Hayır" }, detail.Questions[0].Options);
        Assert.Equal("text", detail.Questions[1].Type);
        Assert.Empty(detail.Questions[1].Options);

        // Taslak anket detayına erişilemez.
        var draft = await service.GetSurveyAsync(_draftSurveyA);
        Assert.Equal(ErrorCodes.NotFound, draft.Error!.Code);
    }

    // ── Firma admin servisi ──────────────────────────────────────────────────

    [Fact]
    public async Task Admin_survey_results_count_answer_distribution()
    {
        await CreateContentService(TenantA, _userA1).SubmitSurveyResponseAsync(
            _surveySingleA, BuildAnswers((_questionSingleA, "Evet")));
        await CreateContentService(TenantA, _userA2).SubmitSurveyResponseAsync(
            _surveySingleA, BuildAnswers((_questionSingleA, "Evet"), (_questionTextA, "Harika")));

        var admin = CreateAdminService(TenantA, _userA2);
        var result = await admin.GetSurveyResultsAsync(_surveySingleA);

        Assert.True(result.IsSuccess);
        var results = result.Value;
        Assert.Equal(2, results.ResponseCount);

        var singleQuestion = results.Questions.Single(q => q.QuestionId == _questionSingleA);
        Assert.Equal(2, singleQuestion.Distribution["Evet"]);

        var textQuestion = results.Questions.Single(q => q.QuestionId == _questionTextA);
        Assert.Equal(1, textQuestion.Distribution["Harika"]);
    }

    [Fact]
    public async Task Admin_cannot_modify_global_or_other_tenant_announcements()
    {
        var admin = CreateAdminService(TenantA, _userA2);
        var update = new AnnouncementUpsertRequest("Ele Geçirildi", "...", null, "published", null);

        // Global (platform) duyuru firma admin tarafından değiştirilemez/silinemez.
        var updateGlobal = await admin.UpdateAnnouncementAsync(_globalAnnouncement, update);
        var deleteGlobal = await admin.DeleteAnnouncementAsync(_globalAnnouncement);
        Assert.Equal(ErrorCodes.NotFound, updateGlobal.Error!.Code);
        Assert.Equal(ErrorCodes.NotFound, deleteGlobal.Error!.Code);

        // Başka tenant'ın duyurusu da görünmez; admin listesinde global içerik yer almaz.
        var updateOther = await admin.UpdateAnnouncementAsync(_companyAnnouncementB, update);
        Assert.Equal(ErrorCodes.NotFound, updateOther.Error!.Code);

        var list = await admin.GetAnnouncementsAsync();
        Assert.DoesNotContain(list.Value.Items, a => a.Id == _globalAnnouncement);
        Assert.DoesNotContain(list.Value.Items, a => a.Id == _companyAnnouncementB);
        Assert.Contains(list.Value.Items, a => a.Id == _companyAnnouncementA);
    }

    [Fact]
    public async Task Admin_announcement_with_other_tenants_segment_is_rejected()
    {
        var admin = CreateAdminService(TenantA, _userA2);

        var result = await admin.CreateAnnouncementAsync(new AnnouncementUpsertRequest(
            "Hedefli", "İçerik", null, "published", [_segmentB])); // B'nin segmenti

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
    }

    [Fact]
    public async Task Admin_created_published_survey_is_visible_to_users()
    {
        var admin = CreateAdminService(TenantA, _userA2);

        var created = await admin.CreateSurveyAsync(new SurveyUpsertRequest(
            "Yeni Anket",
            SingleResponse: true,
            Status: "published",
            Questions:
            [
                new SurveyQuestionUpsertRequest(1, "rating", "Puanınız?", null),
            ]));
        Assert.True(created.IsSuccess);
        Assert.NotNull(created.Value.PublishedAt);

        var userList = await CreateContentService(TenantA, _userA1).GetSurveysAsync();
        Assert.Contains(userList.Value.Items, s => s.Id == created.Value.Id);

        // Başka tenant'ın kullanıcısı yeni anketi GÖREMEZ (tenant izolasyonu).
        var otherTenantList = await CreateContentService(TenantB, _userB1).GetSurveysAsync();
        Assert.DoesNotContain(otherTenantList.Value.Items, s => s.Id == created.Value.Id);
    }

    // ── İleri tarihli yayım (PANELS_SPEC A.7): zamanı gelmeyen duyuru görünmez ─

    [Fact]
    public async Task Future_dated_announcement_is_hidden_from_home()
    {
        var now = DateTimeOffset.UtcNow;
        var admin = CreateAdminService(TenantA, _userA2);

        var created = await admin.CreateAnnouncementAsync(new AnnouncementUpsertRequest(
            "Yarının Duyurusu", "Henüz erken.", null, "published", null, now.AddHours(6)));
        Assert.True(created.IsSuccess);
        Assert.Equal(now.AddHours(6), created.Value.PublishedAt); // verilen tarih aynen yazılır

        // Sabit saat = şimdi: yayım zamanı gelmediği için listede GÖRÜNMEZ.
        var service = CreateContentService(TenantA, _userA1, new FixedTimeProvider(now));
        var list = await service.GetAnnouncementsAsync(1, 20);
        Assert.DoesNotContain(list.Value.Items, a => a.Id == created.Value.Id);

        // Detay ucundan da sızmaz (NOT_FOUND).
        var detail = await service.GetAnnouncementAsync(created.Value.Id);
        Assert.False(detail.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, detail.Error!.Code);
    }

    [Fact]
    public async Task Future_dated_announcement_becomes_visible_when_time_arrives()
    {
        var now = DateTimeOffset.UtcNow;
        var admin = CreateAdminService(TenantA, _userA2);

        var created = await admin.CreateAnnouncementAsync(new AnnouncementUpsertRequest(
            "Zamanı Gelen Duyuru", "Artık görünür.", null, "published", null, now.AddHours(6)));
        Assert.True(created.IsSuccess);

        // Sabit saat yayım zamanının SONRASINA alınır: duyuru liste + detayda görünür olur.
        var after = CreateContentService(
            TenantA, _userA1, new FixedTimeProvider(now.AddHours(7)));
        var list = await after.GetAnnouncementsAsync(1, 20);
        Assert.Contains(list.Value.Items, a => a.Id == created.Value.Id);

        var detail = await after.GetAnnouncementAsync(created.Value.Id);
        Assert.True(detail.IsSuccess);
        Assert.Equal(now.AddHours(6), detail.Value.PublishedAt);
    }

    [Fact]
    public async Task Admin_survey_with_invalid_question_type_is_rejected()
    {
        var admin = CreateAdminService(TenantA, _userA2);

        var result = await admin.CreateSurveyAsync(new SurveyUpsertRequest(
            "Bozuk Anket",
            SingleResponse: false,
            Status: "draft",
            Questions: [new SurveyQuestionUpsertRequest(1, "emoji", "Geçersiz tip", null)]));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private static SurveyResponseRequest BuildAnswers(params (Guid QuestionId, string Value)[] answers) =>
        new(answers
            .Select(a => new SurveyAnswerDto(a.QuestionId, JsonSerializer.SerializeToElement(a.Value)))
            .ToList());

    /// <summary>timeProvider verilmezse sistem saati; ileri tarihli yayım testleri sabitler.</summary>
    private ContentService CreateContentService(
        Guid tenantId, Guid userId, TimeProvider? timeProvider = null)
    {
        var tenantContext = new StubTenantContext(tenantId, userId);
        return new ContentService(
            CreateContext(tenantId, userId), tenantContext, timeProvider ?? TimeProvider.System);
    }

    private ContentAdminService CreateAdminService(
        Guid tenantId, Guid userId, TimeProvider? timeProvider = null)
    {
        var tenantContext = new StubTenantContext(tenantId, userId);
        return new ContentAdminService(
            CreateContext(tenantId, userId), tenantContext, timeProvider ?? TimeProvider.System);
    }

    private AppDbContext CreateContext(Guid? tenantId, Guid? userId)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        return new AppDbContext(options, new StubTenantContext(tenantId, userId));
    }

    public void Dispose() => _connection.Dispose();

    private sealed class StubTenantContext(Guid? tenantId, Guid? userId) : ITenantContext
    {
        public Guid? TenantId => tenantId;
        public Guid? UserId => userId;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId => TenantId
            ?? throw new InvalidOperationException("Tenant bağlamı yok.");
    }

    /// <summary>Sabit saat — ileri tarihli yayım görünürlüğü deterministik test edilir.</summary>
    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
