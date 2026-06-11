using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Benefits;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.UnitTests.Benefits;

/// <summary>
/// Yan haklar (TODO 2.2): global+firma görünürlüğü, benzer kampanyalar, yayım zamanı.
/// </summary>
public sealed class BenefitsServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 6, 11, 12, 0, 0, TimeSpan.Zero);

    private readonly SqliteConnection _connection;
    private readonly Guid _categoryId = Guid.NewGuid();
    private readonly Guid _globalCampaignId = Guid.NewGuid();

    public BenefitsServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "A", Code = "A", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "B", Code = "B", Status = TenantStatus.Active });

        var category = new CampaignCategory { Id = _categoryId, Code = "campaigns", Name = "Kampanyalar", SortOrder = 1 };
        var otherCategory = new CampaignCategory { Code = "coupons", Name = "Kuponlar", SortOrder = 2 };
        seed.CampaignCategories.AddRange(category, otherCategory);

        seed.Campaigns.AddRange(
            new Campaign
            {
                Id = _globalCampaignId, TenantId = null, CategoryId = _categoryId,
                Title = "Global Kampanya", Body = "g", Status = ContentStatus.Published,
                PublishedAt = Now.AddDays(-1),
            },
            new Campaign
            {
                TenantId = TenantA, CategoryId = _categoryId, Title = "A Firma Kampanyası",
                Body = "a", Status = ContentStatus.Published, PublishedAt = Now.AddDays(-1),
            },
            new Campaign
            {
                TenantId = TenantB, CategoryId = _categoryId, Title = "B Firma Kampanyası",
                Body = "b", Status = ContentStatus.Published, PublishedAt = Now.AddDays(-1),
            },
            // Benzer kampanya: aynı kategori, global.
            new Campaign
            {
                TenantId = null, CategoryId = _categoryId, Title = "Benzer Global",
                Body = "s", Status = ContentStatus.Published, PublishedAt = Now.AddDays(-2),
            },
            // Gelecek tarihli: zamanı gelene kadar görünmez.
            new Campaign
            {
                TenantId = null, CategoryId = _categoryId, Title = "Gelecek Kampanya",
                Body = "f", Status = ContentStatus.Published, PublishedAt = Now.AddDays(1),
            },
            // Taslak: hiç görünmez.
            new Campaign
            {
                TenantId = null, CategoryId = _categoryId, Title = "Taslak",
                Body = "d", Status = ContentStatus.Draft,
            });

        seed.Coupons.Add(new Coupon
        {
            TenantId = null, Title = "Global Kupon", Brand = "Marka",
            Amount = 100m, Status = ContentStatus.Published,
        });

        seed.SaveChanges();
    }

    [Fact]
    public async Task Campaigns_include_global_and_own_tenant_but_not_other_tenant()
    {
        var result = await CreateService(TenantA).GetCampaignsAsync(null, 1, 20);

        var titles = result.Items.Select(c => c.Title).ToList();
        Assert.Contains("Global Kampanya", titles);
        Assert.Contains("A Firma Kampanyası", titles);
        Assert.DoesNotContain("B Firma Kampanyası", titles);
        Assert.DoesNotContain("Gelecek Kampanya", titles); // yayım zamanı gelmedi
        Assert.DoesNotContain("Taslak", titles);
    }

    [Fact]
    public async Task Campaign_detail_returns_similar_from_same_category_excluding_self()
    {
        var result = await CreateService(TenantA).GetCampaignAsync(_globalCampaignId);

        Assert.True(result.IsSuccess);
        Assert.DoesNotContain(result.Value.Similar, s => s.Id == _globalCampaignId);
        Assert.Contains(result.Value.Similar, s => s.Title == "Benzer Global");
        Assert.DoesNotContain(result.Value.Similar, s => s.Title == "B Firma Kampanyası");
    }

    [Fact]
    public async Task Future_campaign_detail_is_not_found()
    {
        using var context = CreateContext(TenantA);
        var future = context.Campaigns.IgnoreQueryFilters()
            .Single(c => c.Title == "Gelecek Kampanya");

        var result = await CreateService(TenantA).GetCampaignAsync(future.Id);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
    }

    [Fact]
    public async Task Coupons_amount_is_invariant_money_string()
    {
        var coupons = await CreateService(TenantA).GetCouponsAsync();

        var coupon = Assert.Single(coupons);
        Assert.Equal("100.00", coupon.Amount);
    }

    [Fact]
    public async Task Categories_are_sorted_by_sort_order()
    {
        var categories = await CreateService(TenantA).GetCategoriesAsync();

        Assert.Equal(new[] { "campaigns", "coupons" }, categories.Select(c => c.Code).ToArray());
    }

    private BenefitsService CreateService(Guid tenantId) =>
        new(CreateContext(tenantId), new FixedTimeProvider(Now));

    private AppDbContext CreateContext(Guid? tenantId)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new AppDbContext(options, new StubTenantContext(tenantId));
    }

    public void Dispose() => _connection.Dispose();

    private sealed class StubTenantContext(Guid? tenantId) : ITenantContext
    {
        public Guid? TenantId => tenantId;
        public Guid? UserId => null;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId => TenantId ?? throw new InvalidOperationException();
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
