using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Tenants;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace MetropolBusiness.UnitTests.Tenants;

/// <summary>
/// Firma admin + platform admin servis senaryoları (TODO 1.9 backend, API_CONTRACT §12/§13):
/// firma admin yalnız KENDİ tenant'ını görür (KRİTİK izolasyon testi), telefon tenant
/// içinde benzersiz, segment silme koruması, modül kodu doğrulaması, platform tenant
/// listesi PII'siz (userCount), tenant code benzersiz, admin daveti doğru tenant'a,
/// anonim branding ucu yalnız aktif tenant. SQLite in-memory (ContentServiceTests deseni).
/// </summary>
public sealed class AdminServicesTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid TenantPassive = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private readonly SqliteConnection _connection;

    private readonly Guid _adminA = Guid.NewGuid();  // tenant A company_admin
    private readonly Guid _userA2 = Guid.NewGuid();  // tenant A enduser (segmentli)
    private readonly Guid _userB1 = Guid.NewGuid();  // tenant B enduser

    private readonly Guid _segmentDoluA = Guid.NewGuid(); // userA2 bağlı — silinemez
    private readonly Guid _segmentBosA = Guid.NewGuid();  // boş — silinebilir
    private readonly Guid _segmentB = Guid.NewGuid();     // tenant B segmenti

    public AdminServicesTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null, isPlatformAdmin: false);
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
            new Tenant { Id = TenantB, Name = "Firma B", Code = "BBB", Status = TenantStatus.Active },
            new Tenant
            {
                Id = TenantPassive,
                Name = "Pasif Firma",
                Code = "PAS",
                Status = TenantStatus.Passive,
            });

        seed.Users.AddRange(
            new User
            {
                Id = _adminA,
                TenantId = TenantA,
                Phone = "5550000001",
                FirstName = "Admin",
                Role = UserRole.CompanyAdmin,
            },
            new User { Id = _userA2, TenantId = TenantA, Phone = "5551112233", FirstName = "Ayşe" },
            new User { Id = _userB1, TenantId = TenantB, Phone = "5550000003", FirstName = "Burak" });

        seed.Segments.AddRange(
            new Segment { Id = _segmentDoluA, TenantId = TenantA, Name = "Saha" },
            new Segment { Id = _segmentBosA, TenantId = TenantA, Name = "Boş Segment" },
            new Segment { Id = _segmentB, TenantId = TenantB, Name = "B Ekibi" });

        seed.UserSegments.Add(new UserSegment { UserId = _userA2, SegmentId = _segmentDoluA });

        seed.Modules.AddRange(
            new Module { Code = "leave_request", Name = "İzin Talebi", IsActive = true },
            new Module { Code = "expense_request", Name = "Masraf Talebi", IsActive = true },
            new Module { Code = "old_module", Name = "Eski Modül", IsActive = false });

        seed.SaveChanges();
    }

    // ── (c) KRİTİK: firma admin kullanıcı listesi yalnız kendi tenant ────────

    [Fact]
    public async Task Company_user_list_contains_only_own_tenant()
    {
        var serviceA = CreateUsersService(TenantA, _adminA);

        var result = await serviceA.GetUsersAsync(q: null, segmentId: null, status: null, 1, 20);

        Assert.True(result.IsSuccess);
        var ids = result.Value.Items.Select(u => u.Id).ToList();
        Assert.Contains(_adminA, ids);
        Assert.Contains(_userA2, ids);
        Assert.DoesNotContain(_userB1, ids); // tenant izolasyonu (CLAUDE.md kural 1)
        Assert.Equal(2, result.Value.Total);

        // Başka tenant'ın kullanıcısı id ile de erişilemez → NOT_FOUND (sızıntı yok).
        var updateOther = await serviceA.UpdateUserAsync(
            _userB1, new CompanyUserUpdateRequest("Ele", "Geçirildi", null, null, null));
        Assert.False(updateOther.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, updateOther.Error!.Code);
    }

    // ── (d) Telefon tenant içinde benzersiz; farklı tenant'ta aynı telefon OK ─

    [Fact]
    public async Task Duplicate_phone_rejected_in_same_tenant_but_allowed_in_other()
    {
        var serviceA = CreateUsersService(TenantA, _adminA);
        var serviceB = CreateUsersService(TenantB, _userB1);

        // Aynı tenant'ta mevcut telefon → VALIDATION_ERROR (API_CONTRACT §12).
        var duplicate = await serviceA.CreateUserAsync(new CompanyUserCreateRequest(
            "5551112233", "Yeni", "Kişi", null, null, null));
        Assert.False(duplicate.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, duplicate.Error!.Code);

        // Farklı tenant'ta aynı telefon serbest (UNIQUE(tenant_id, phone)).
        var otherTenant = await serviceB.CreateUserAsync(new CompanyUserCreateRequest(
            "5551112233", "Bilge", "Kaya", null, null, null));
        Assert.True(otherTenant.IsSuccess);
        Assert.Equal("enduser", otherTenant.Value.Role);
    }

    // ── Kullanıcı ekle: başka tenant'ın segmenti reddedilir; DELETE pasifleştirir ─

    [Fact]
    public async Task Create_user_with_other_tenants_segment_is_rejected()
    {
        var serviceA = CreateUsersService(TenantA, _adminA);

        var result = await serviceA.CreateUserAsync(new CompanyUserCreateRequest(
            "5557778899", "Deneme", null, null, null, [_segmentB])); // B'nin segmenti

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
    }

    // ── KARAR 2026-06-11: her kullanıcıya Metropol MemberId otomatik atanır ──

    [Fact]
    public async Task Created_user_gets_auto_member_id()
    {
        var serviceA = CreateUsersService(TenantA, _adminA);

        var created = await serviceA.CreateUserAsync(new CompanyUserCreateRequest(
            "5554443322", "Mehmet", "Demir", null, null, null));
        Assert.True(created.IsSuccess);

        // MemberId = Id'nin 32 hex hali ("N") — benzersiz, ek sekans altyapısı yok.
        using var verify = CreateContext(TenantA, _adminA, isPlatformAdmin: false);
        var user = verify.Users.AsNoTracking().Single(u => u.Id == created.Value.Id);
        Assert.Equal(user.Id.ToString("N"), user.MemberId);
        Assert.Equal(32, user.MemberId!.Length);
        Assert.Matches("^[0-9a-f]{32}$", user.MemberId);
    }

    [Fact]
    public async Task Invited_admin_gets_auto_member_id_and_filled_member_id_is_kept()
    {
        var service = CreatePlatformTenantsService();

        var invited = await service.InviteAdminAsync(TenantB, new TenantAdminInviteRequest(
            "5551231212", "Yeni", "Admin", null));
        Assert.True(invited.IsSuccess);

        // IgnoreQueryFilters: test platform admin bağlamında (tenant claim'i yok) doğrular.
        using var verify = CreateContext(null, null, isPlatformAdmin: true);
        var admin = verify.Users.IgnoreQueryFilters().AsNoTracking()
            .Single(u => u.Id == invited.Value.Id);
        Assert.Equal(admin.Id.ToString("N"), admin.MemberId);

        // Dolu MemberId'ye DOKUNULMAZ (elle atanmış Metropol numarası korunur).
        var manual = new User { MemberId = "3299" };
        manual.EnsureMemberId();
        Assert.Equal("3299", manual.MemberId);

        // Boş string de "boş" sayılır ve atanır.
        var blank = new User { MemberId = "" };
        blank.EnsureMemberId();
        Assert.Equal(blank.Id.ToString("N"), blank.MemberId);
    }

    [Fact]
    public async Task Delete_user_deactivates_instead_of_removing()
    {
        var serviceA = CreateUsersService(TenantA, _adminA);

        var result = await serviceA.DeactivateUserAsync(_userA2);
        Assert.True(result.IsSuccess);

        // Kayıt durur (hard delete YOK), durum passive olur.
        using var verify = CreateContext(TenantA, _adminA, isPlatformAdmin: false);
        var user = verify.Users.AsNoTracking().Single(u => u.Id == _userA2);
        Assert.Equal(EntityStatus.Passive, user.Status);
        Assert.Null(user.DeletedAt);
    }

    // ── (e) Segment silme: kullanıcı varsa engellenir ────────────────────────

    [Fact]
    public async Task Segment_delete_is_blocked_while_users_assigned()
    {
        var service = CreateSegmentsService(TenantA, _adminA);

        var blocked = await service.DeleteSegmentAsync(_segmentDoluA);
        Assert.False(blocked.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, blocked.Error!.Code);

        // Boş segment silinebilir.
        var deleted = await service.DeleteSegmentAsync(_segmentBosA);
        Assert.True(deleted.IsSuccess);

        var list = await service.GetSegmentsAsync();
        Assert.DoesNotContain(list.Value.Items, s => s.Id == _segmentBosA);
        Assert.Contains(list.Value.Items, s => s.Id == _segmentDoluA);
    }

    // ── Segment→modül: tanımsız/pasif kod VALIDATION_ERROR ───────────────────

    [Fact]
    public async Task Segment_modules_reject_unknown_or_passive_codes()
    {
        var service = CreateSegmentsService(TenantA, _adminA);

        var unknown = await service.UpdateSegmentModulesAsync(
            _segmentBosA, new SegmentModulesUpdateRequest(["tanimsiz_modul"]));
        Assert.False(unknown.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, unknown.Error!.Code);

        var passive = await service.UpdateSegmentModulesAsync(
            _segmentBosA, new SegmentModulesUpdateRequest(["leave_request", "old_module"]));
        Assert.False(passive.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, passive.Error!.Code);

        var valid = await service.UpdateSegmentModulesAsync(
            _segmentBosA, new SegmentModulesUpdateRequest(["leave_request", "expense_request"]));
        Assert.True(valid.IsSuccess);
        Assert.Equal(["expense_request", "leave_request"], valid.Value.ModuleCodes);
    }

    // ── (f) Platform tenant listesi: PII YOK, userCount doğru ────────────────

    [Fact]
    public async Task Platform_tenant_list_is_pii_free_and_counts_users()
    {
        var service = CreatePlatformTenantsService();

        var result = await service.GetTenantsAsync(q: null, status: null, 1, 20);

        Assert.True(result.IsSuccess);
        var tenantA = result.Value.Items.Single(t => t.Id == TenantA);
        var tenantB = result.Value.Items.Single(t => t.Id == TenantB);
        Assert.Equal(2, tenantA.UserCount); // adminA + userA2 — satır değil yalnız SAYI
        Assert.Equal(1, tenantB.UserCount);
        Assert.Equal("#F2697B", tenantA.Branding.PrimaryColor);

        // PII alanlarının DTO'da OLMADIĞI derleme garantisidir; burada ayrıca
        // tip üzerinde telefon/TCKN/e-posta benzeri property bulunmadığı doğrulanır.
        var propertyNames = typeof(PlatformTenantDto).GetProperties().Select(p => p.Name);
        Assert.DoesNotContain(propertyNames, name =>
            name.Contains("Phone", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Tckn", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Email", StringComparison.OrdinalIgnoreCase));
    }

    // ── (g) Tenant code benzersiz ────────────────────────────────────────────

    [Fact]
    public async Task Tenant_code_must_be_unique()
    {
        var service = CreatePlatformTenantsService();

        var duplicate = await service.CreateTenantAsync(new TenantCreateRequest(
            "Kopya Firma", "AAA", null, null));
        Assert.False(duplicate.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, duplicate.Error!.Code);

        var created = await service.CreateTenantAsync(new TenantCreateRequest(
            "Yeni Firma", "YENI", "secret-ref-yeni",
            new TenantBrandingDto("https://cdn.example.com/y.png", "#123456", null)));
        Assert.True(created.IsSuccess);
        Assert.Equal("pending", created.Value.Status); // onay durum değişimiyle (PUT) yapılır
        Assert.Equal(0, created.Value.UserCount);
    }

    // ── (h) Firma admin daveti doğru tenant'a company_admin yaratır ──────────

    [Fact]
    public async Task Invite_admin_creates_company_admin_in_target_tenant()
    {
        var service = CreatePlatformTenantsService();

        var result = await service.InviteAdminAsync(TenantB, new TenantAdminInviteRequest(
            "5559998877", "Banu", "Yönetici", "banu@b.com"));

        Assert.True(result.IsSuccess);
        Assert.Equal(TenantB, result.Value.TenantId);
        Assert.Equal("company_admin", result.Value.Role);
        // Şifre belirleme daveti yanıtla döner (yalnızca bir kez; log'lanmaz).
        Assert.Equal(FakePanelAuthService.Token, result.Value.InviteToken);

        // DB doğrulaması: kullanıcı hedef tenant'ta company_admin rolüyle açıldı.
        // IgnoreQueryFilters: test platform admin bağlamında (tenant claim'i yok) doğrular.
        using var verify = CreateContext(null, null, isPlatformAdmin: true);
        var admin = verify.Users.IgnoreQueryFilters().AsNoTracking()
            .Single(u => u.Id == result.Value.Id);
        Assert.Equal(TenantB, admin.TenantId);
        Assert.Equal(UserRole.CompanyAdmin, admin.Role);
        Assert.Equal(EntityStatus.Active, admin.Status);

        // Aynı tenant'ta aynı telefonla ikinci davet reddedilir.
        var duplicate = await service.InviteAdminAsync(TenantB, new TenantAdminInviteRequest(
            "5559998877", "Tekrar", null, null));
        Assert.False(duplicate.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, duplicate.Error!.Code);

        // Telefonsuz davet olmaz: giriş OTP'lidir (API_CONTRACT §1).
        var noPhone = await service.InviteAdminAsync(TenantB, new TenantAdminInviteRequest(
            "", "Adsız", null, null));
        Assert.False(noPhone.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, noPhone.Error!.Code);
    }

    // ── (i) Branding ucu: yalnız aktif tenant; pasif/bilinmeyen 404 ──────────

    [Fact]
    public async Task Branding_endpoint_returns_404_for_passive_or_unknown_tenant()
    {
        var service = CreateBrandingService();

        var active = await service.GetBrandingAsync("AAA");
        Assert.True(active.IsSuccess);
        Assert.Equal("Firma A", active.Value.Name);
        Assert.Equal("#F2697B", active.Value.PrimaryColor);
        Assert.Equal("#202833", active.Value.SecondaryColor);

        var passive = await service.GetBrandingAsync("PAS");
        Assert.False(passive.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, passive.Error!.Code);
        Assert.Equal(404, passive.Error!.HttpStatus);

        var unknown = await service.GetBrandingAsync("YOK");
        Assert.False(unknown.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, unknown.Error!.Code);
    }

    // ── Platform modül tanımları: code benzersiz ─────────────────────────────

    [Fact]
    public async Task Platform_module_code_must_be_unique()
    {
        var service = new PlatformModulesService(
            CreateContext(null, null, isPlatformAdmin: true),
            NullLogger<PlatformModulesService>.Instance);

        var duplicate = await service.CreateModuleAsync(
            new ModuleUpsertRequest("leave_request", "Kopya", true));
        Assert.False(duplicate.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, duplicate.Error!.Code);

        var created = await service.CreateModuleAsync(
            new ModuleUpsertRequest("new_module", "Yeni Modül", true));
        Assert.True(created.IsSuccess);
        Assert.True(created.Value.IsActive);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private CompanyUsersService CreateUsersService(Guid tenantId, Guid userId)
    {
        var tenantContext = new StubTenantContext(tenantId, userId, isPlatformAdmin: false);
        return new CompanyUsersService(
            CreateContext(tenantId, userId, isPlatformAdmin: false), tenantContext);
    }

    private CompanySegmentsService CreateSegmentsService(Guid tenantId, Guid userId) =>
        new(CreateContext(tenantId, userId, isPlatformAdmin: false));

    /// <summary>Platform admin bağlamı: tenant claim'i YOK (tenant-üstü, ARCHITECTURE §3.2).</summary>
    private PlatformTenantsService CreatePlatformTenantsService() => new(
        CreateContext(tenantId: null, userId: Guid.NewGuid(), isPlatformAdmin: true),
        new FakePanelAuthService(),
        NullLogger<PlatformTenantsService>.Instance);

    /// <summary>Branding ucu anonimdir: tenant da kullanıcı da yoktur.</summary>
    private TenantBrandingService CreateBrandingService() =>
        new(CreateContext(tenantId: null, userId: null, isPlatformAdmin: false));

    private AppDbContext CreateContext(Guid? tenantId, Guid? userId, bool isPlatformAdmin)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        return new AppDbContext(options, new StubTenantContext(tenantId, userId, isPlatformAdmin));
    }

    public void Dispose() => _connection.Dispose();

    private sealed class StubTenantContext(Guid? tenantId, Guid? userId, bool isPlatformAdmin)
        : ITenantContext
    {
        public Guid? TenantId => tenantId;
        public Guid? UserId => userId;
        public bool IsPlatformAdmin => isPlatformAdmin;
        public Guid RequiredTenantId => TenantId
            ?? throw new InvalidOperationException("Tenant bağlamı yok.");
    }

    /// <summary>Davet token üretimi sahte: davet akışının kendisi PanelAuthServiceTests'te test edilir.</summary>
    private sealed class FakePanelAuthService : IPanelAuthService
    {
        public const string Token = "fake-invite-token";

        public Task<Result<PanelLoginResponse>> LoginAsync(
            PanelLoginRequest request, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<Result<bool>> SetPasswordAsync(
            SetPasswordRequest request, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<string> CreateInviteAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Token);
    }
}
