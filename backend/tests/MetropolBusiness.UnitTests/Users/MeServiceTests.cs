using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Users;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Security;
using MetropolBusiness.Infrastructure.Users;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.UnitTests.Users;

/// <summary>
/// /me senaryoları (TODO 1.9 backend, API_CONTRACT §2): TCKN yalnızca maskeli döner,
/// modüller segment BİRLEŞİMİ olarak gelir (pasif modül hariç), tercih roundtrip'i,
/// profil güncelleme validasyonu. SQLite in-memory AppDbContext (ContentServiceTests deseni).
/// </summary>
public sealed class MeServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string SeededTckn = "12345678901";

    private readonly SqliteConnection _connection;
    private readonly PlaceholderFieldCipher _cipher = new();

    private readonly Guid _userA1 = Guid.NewGuid(); // tenant A, iki segmentte, TCKN'li
    private readonly Guid _userA2 = Guid.NewGuid(); // tenant A, segmentsiz, TCKN'siz

    private readonly Guid _segmentIkA = Guid.NewGuid();
    private readonly Guid _segmentYonetimA = Guid.NewGuid();

    public MeServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant
            {
                Id = TenantA,
                Name = "Firma A",
                Code = "AAA",
                Status = TenantStatus.Active,
                BrandLogoUrl = "https://cdn.example.com/a-logo.png",
                BrandPrimaryColor = "#F2697B",
                BrandSecondaryColor = "#202833",
            },
            new Tenant { Id = TenantB, Name = "Firma B", Code = "BBB", Status = TenantStatus.Active });

        seed.Users.AddRange(
            new User
            {
                Id = _userA1,
                TenantId = TenantA,
                Phone = "5550000001",
                FirstName = "Ali",
                LastName = "Tekin",
                Email = "ali@a.com",
                City = "İstanbul",
                TcknEncrypted = _cipher.Encrypt(SeededTckn),
            },
            new User { Id = _userA2, TenantId = TenantA, Phone = "5550000002", FirstName = "Ayşe" });

        seed.Segments.AddRange(
            new Segment { Id = _segmentIkA, TenantId = TenantA, Name = "İK" },
            new Segment { Id = _segmentYonetimA, TenantId = TenantA, Name = "Yönetim" });

        var leaveModule = new Module { Code = "leave_request", Name = "İzin Talebi", IsActive = true };
        var expenseModule = new Module { Code = "expense_request", Name = "Masraf Talebi", IsActive = true };
        var approvalModule = new Module { Code = "expense_approval", Name = "Masraf Onay", IsActive = true };
        var passiveModule = new Module { Code = "old_module", Name = "Eski Modül", IsActive = false };
        seed.Modules.AddRange(leaveModule, expenseModule, approvalModule, passiveModule);

        // expense_request iki segmentte de var: birleşim DISTINCT olmalı.
        seed.SegmentModules.AddRange(
            new SegmentModule { SegmentId = _segmentIkA, ModuleId = leaveModule.Id },
            new SegmentModule { SegmentId = _segmentIkA, ModuleId = expenseModule.Id },
            new SegmentModule { SegmentId = _segmentYonetimA, ModuleId = expenseModule.Id },
            new SegmentModule { SegmentId = _segmentYonetimA, ModuleId = approvalModule.Id },
            new SegmentModule { SegmentId = _segmentYonetimA, ModuleId = passiveModule.Id });

        seed.UserSegments.AddRange(
            new UserSegment { UserId = _userA1, SegmentId = _segmentIkA },
            new UserSegment { UserId = _userA1, SegmentId = _segmentYonetimA });

        seed.SaveChanges();
    }

    // ── (a) GET /me: TCKN yalnızca MASKELİ döner ─────────────────────────────

    [Fact]
    public async Task GetMe_returns_masked_tckn_and_tenant_branding()
    {
        var service = CreateMeService(TenantA, _userA1);

        var result = await service.GetMeAsync();

        Assert.True(result.IsSuccess);
        var me = result.Value;
        Assert.Equal("12*******01", me.TcknMasked); // Masking.MaskTckn: ilk 2 + 7 yıldız + son 2
        Assert.DoesNotContain(SeededTckn, me.TcknMasked); // düz TCKN sızmaz
        Assert.Equal("enduser", me.Role);
        Assert.Equal(TenantA, me.Tenant.Id);
        Assert.Equal("#F2697B", me.Tenant.Branding.PrimaryColor);
        Assert.Equal("https://cdn.example.com/a-logo.png", me.Tenant.Branding.LogoUrl);

        // TCKN'si olmayan kullanıcıda alan null'dur (boş maske uydurulmaz).
        var withoutTckn = await CreateMeService(TenantA, _userA2).GetMeAsync();
        Assert.Null(withoutTckn.Value.TcknMasked);
    }

    // ── (b) GET /me/modules: segment birleşimi, distinct, pasif modül hariç ──

    [Fact]
    public async Task Me_modules_returns_distinct_union_of_segments_without_passive()
    {
        var result = await CreateMeService(TenantA, _userA1).GetModulesAsync();

        Assert.True(result.IsSuccess);
        var codes = result.Value.Modules.Select(m => m.Code).ToList();
        Assert.Equal(["expense_approval", "expense_request", "leave_request"], codes);

        // Segmentsiz kullanıcı modül görmez (yetki backend'de).
        var empty = await CreateMeService(TenantA, _userA2).GetModulesAsync();
        Assert.Empty(empty.Value.Modules);
    }

    // ── PUT /me/tckn: 11 hane validasyonu + şifreli saklama ──────────────────

    [Fact]
    public async Task UpdateTckn_validates_11_digits()
    {
        var service = CreateMeService(TenantA, _userA2);

        var tooShort = await service.UpdateTcknAsync(new TcknUpdateRequest("123"));
        Assert.False(tooShort.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, tooShort.Error!.Code);

        var nonDigit = await service.UpdateTcknAsync(new TcknUpdateRequest("1234567890a"));
        Assert.False(nonDigit.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, nonDigit.Error!.Code);
    }

    [Fact]
    public async Task UpdateTckn_stores_encrypted_and_returns_masked()
    {
        const string newTckn = "98765432109";
        var service = CreateMeService(TenantA, _userA2);

        var result = await service.UpdateTcknAsync(new TcknUpdateRequest(newTckn));

        Assert.True(result.IsSuccess);
        Assert.Equal("98*******09", result.Value.TcknMasked);

        // DB'de düz metin YOK: "enc:" önekli şifreli değer saklanır (CLAUDE.md kural 4).
        using var verify = CreateContext(TenantA, _userA2);
        var stored = verify.Users.AsNoTracking().Single(u => u.Id == _userA2).TcknEncrypted;
        Assert.NotNull(stored);
        Assert.StartsWith("enc:", stored);
        Assert.DoesNotContain(newTckn, stored);
    }

    // ── GET/PUT /me/preferences ──────────────────────────────────────────────

    [Fact]
    public async Task Preferences_default_to_enabled_and_roundtrip()
    {
        var service = CreateMeService(TenantA, _userA1);

        var defaults = await service.GetPreferencesAsync();
        Assert.True(defaults.IsSuccess);
        Assert.True(defaults.Value.CampaignNotifications);
        Assert.True(defaults.Value.AnnouncementNotifications);

        var updated = await service.UpdatePreferencesAsync(
            new PreferencesDto(CampaignNotifications: false, AnnouncementNotifications: true));
        Assert.True(updated.IsSuccess);

        var reloaded = await CreateMeService(TenantA, _userA1).GetPreferencesAsync();
        Assert.False(reloaded.Value.CampaignNotifications);
        Assert.True(reloaded.Value.AnnouncementNotifications);
    }

    // ── PUT /me: profil güncelleme ───────────────────────────────────────────

    [Fact]
    public async Task UpdateMe_updates_profile_and_requires_names()
    {
        var service = CreateMeService(TenantA, _userA2);

        var missingName = await service.UpdateMeAsync(
            new MeUpdateRequest(null, "Soyad", null, null, null));
        Assert.False(missingName.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, missingName.Error!.Code);

        var result = await service.UpdateMeAsync(new MeUpdateRequest(
            "Ayşe", "Yılmaz", "ayse@a.com", "Ankara", "https://cdn.example.com/avatar.png"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Ayşe", result.Value.FirstName);
        Assert.Equal("Yılmaz", result.Value.LastName);
        Assert.Equal("ayse@a.com", result.Value.Email);
        Assert.Equal("Ankara", result.Value.City);
    }

    [Fact]
    public async Task DeleteMe_soft_deletes_and_user_disappears_from_queries()
    {
        var result = await CreateMeService(TenantA, _userA2).DeleteMeAsync();

        Assert.True(result.IsSuccess);
        // Soft delete: query filter kullanıcıyı gizler — /me artık 404.
        var after = await CreateMeService(TenantA, _userA2).GetMeAsync();
        Assert.False(after.IsSuccess);

        using var verify = CreateContext(TenantA, _userA2);
        var row = verify.Users.IgnoreQueryFilters().Single(u => u.Id == _userA2);
        Assert.NotNull(row.DeletedAt); // kayıt SİLİNMEDİ, işaretlendi (CLAUDE.md kural 7)
    }
    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private MeService CreateMeService(Guid tenantId, Guid userId)
    {
        var tenantContext = new StubTenantContext(tenantId, userId);
        return new MeService(CreateContext(tenantId, userId), tenantContext, _cipher);
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
}
