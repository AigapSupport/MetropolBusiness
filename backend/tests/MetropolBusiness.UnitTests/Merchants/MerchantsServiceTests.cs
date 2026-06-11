using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Merchants;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Merchants;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.UnitTests.Cards;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.UnitTests.Merchants;

/// <summary>Keşfet (TODO 2.1): merchant listesi cache'i + yerel geri bildirim kaydı.</summary>
public sealed class MerchantsServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly SqliteConnection _connection;
    private readonly FakeMetropolApiClient _metropol = new();
    private readonly MemoryDistributedCache _cache =
        new(Options.Create(new MemoryDistributedCacheOptions()));
    private readonly Guid _userId = Guid.NewGuid();

    public MerchantsServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext();
        seed.Database.EnsureCreated();
        seed.Tenants.Add(new Tenant { Id = TenantA, Name = "A", Code = "A", Status = TenantStatus.Active });
        seed.Users.Add(new User { Id = _userId, TenantId = TenantA, Phone = "1" });
        seed.SaveChanges();
    }

    [Fact]
    public async Task Second_merchant_query_is_served_from_cache_without_upstream_call()
    {
        var first = await CreateService().GetMerchantsAsync(2, 1, null);
        Assert.True(first.IsSuccess);
        Assert.Single(_metropol.MerchantListCalls);
        Assert.Equal("İstanbul Kokoreç", Assert.Single(first.Value.Items).SignboardName);

        var second = await CreateService().GetMerchantsAsync(2, 1, null);

        Assert.True(second.IsSuccess);
        Assert.Single(_metropol.MerchantListCalls); // upstream'e ikinci kez gidilmedi
        Assert.Equal(first.Value.LastListVersionDate, second.Value.LastListVersionDate);
    }

    [Fact]
    public async Task Different_sector_uses_separate_cache_entry()
    {
        await CreateService().GetMerchantsAsync(2, 1, null);
        await CreateService().GetMerchantsAsync(0, 1, null);

        Assert.Equal(2, _metropol.MerchantListCalls.Count);
    }

    [Fact]
    public async Task Feedback_is_stored_locally_with_tenant_and_user()
    {
        var result = await CreateService().SubmitFeedbackAsync(
            "0000000005", new MerchantFeedbackRequestDto("Harika mekân"));

        Assert.True(result.IsSuccess);
        using var verify = CreateContext();
        var feedback = verify.MerchantFeedbacks.Single();
        Assert.Equal(TenantA, feedback.TenantId);
        Assert.Equal(_userId, feedback.UserId);
        Assert.Equal("0000000005", feedback.MerchantCode);
    }

    [Fact]
    public async Task Empty_feedback_message_is_rejected()
    {
        var result = await CreateService().SubmitFeedbackAsync(
            "0000000005", new MerchantFeedbackRequestDto("  "));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
    }

    private MerchantsService CreateService() =>
        new(_metropol, CreateContext(), new StubTenantContext(TenantA, _userId), _cache);

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new AppDbContext(options, new StubTenantContext(TenantA, _userId));
    }

    public void Dispose() => _connection.Dispose();

    private sealed class StubTenantContext(Guid? tenantId, Guid? userId) : ITenantContext
    {
        public Guid? TenantId => tenantId;
        public Guid? UserId => userId;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId => TenantId ?? throw new InvalidOperationException();
    }
}
