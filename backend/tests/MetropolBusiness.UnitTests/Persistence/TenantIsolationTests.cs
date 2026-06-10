using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.UnitTests.Persistence;

/// <summary>
/// EN KRİTİK test (CLAUDE.md kural 1, TODO 1.1):
/// "A firması kullanıcısı B firması verisine erişemez."
/// SQLite in-memory ile global query filter + TenantId otomatik atama doğrulanır.
/// Gerçek Postgres entegrasyon testi Docker engeli çözülünce eklenecek (LESSONS.md).
/// </summary>
public sealed class TenantIsolationTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly SqliteConnection _connection;

    public TenantIsolationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seedContext = CreateContext(tenantId: null);
        seedContext.Database.EnsureCreated();

        seedContext.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "Firma A", Code = "A", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "Firma B", Code = "B", Status = TenantStatus.Active });

        seedContext.Users.AddRange(
            new User { TenantId = TenantA, Phone = "5550000001", FirstName = "Ali" },
            new User { TenantId = TenantA, Phone = "5550000002", FirstName = "Ayşe" },
            new User { TenantId = TenantB, Phone = "5550000001", FirstName = "Burak" },
            new User
            {
                TenantId = TenantA,
                Phone = "5550000003",
                FirstName = "Silinmiş",
                DeletedAt = DateTimeOffset.UtcNow,
            });

        seedContext.Segments.AddRange(
            new Segment { TenantId = TenantA, Name = "Tüm Çalışanlar" },
            new Segment { TenantId = TenantB, Name = "Tüm Çalışanlar" });

        seedContext.SaveChanges();
    }

    [Fact]
    public void Tenant_A_user_cannot_see_tenant_B_users()
    {
        using var context = CreateContext(TenantA);

        var users = context.Users.ToList();

        Assert.Equal(2, users.Count);
        Assert.All(users, u => Assert.Equal(TenantA, u.TenantId));
        Assert.DoesNotContain(users, u => u.FirstName == "Burak");
    }

    [Fact]
    public void Tenant_B_sees_only_own_users()
    {
        using var context = CreateContext(TenantB);

        var users = context.Users.ToList();

        var user = Assert.Single(users);
        Assert.Equal("Burak", user.FirstName);
    }

    [Fact]
    public void Soft_deleted_users_are_filtered_out()
    {
        using var context = CreateContext(TenantA);

        Assert.DoesNotContain(context.Users.ToList(), u => u.FirstName == "Silinmiş");
    }

    [Fact]
    public void Segments_are_tenant_filtered()
    {
        using var context = CreateContext(TenantA);

        var segment = Assert.Single(context.Segments.ToList());
        Assert.Equal(TenantA, segment.TenantId);
    }

    [Fact]
    public void User_segment_links_are_tenant_filtered()
    {
        using (var seed = CreateContext(tenantId: null))
        {
            var userA = seed.Users.IgnoreQueryFilters().First(u => u.FirstName == "Ali");
            var segmentA = seed.Segments.IgnoreQueryFilters().First(s => s.TenantId == TenantA);
            var userB = seed.Users.IgnoreQueryFilters().First(u => u.FirstName == "Burak");
            var segmentB = seed.Segments.IgnoreQueryFilters().First(s => s.TenantId == TenantB);
            seed.UserSegments.AddRange(
                new UserSegment { UserId = userA.Id, SegmentId = segmentA.Id },
                new UserSegment { UserId = userB.Id, SegmentId = segmentB.Id });
            seed.SaveChanges();
        }

        using var context = CreateContext(TenantA);
        var links = context.UserSegments.ToList();

        var link = Assert.Single(links);
        Assert.Equal(TenantA, context.Segments.Single(s => s.Id == link.SegmentId).TenantId);
    }

    [Fact]
    public void No_tenant_context_sees_nothing()
    {
        // Token'sız/tenant'sız bağlam hiçbir tenant verisi göremez (varsayılan kapalı).
        using var context = CreateContext(tenantId: null);

        Assert.Empty(context.Users.ToList());
        Assert.Empty(context.Segments.ToList());
    }

    [Fact]
    public void Platform_admin_must_explicitly_ignore_filters()
    {
        // Platform admin senaryosu filtreyi ancak açık gerekçeyle aşar (ARCHITECTURE §3.3).
        using var context = CreateContext(tenantId: null);

        var allUsers = context.Users.IgnoreQueryFilters().ToList();

        Assert.Equal(4, allUsers.Count);
    }

    [Fact]
    public void Added_entity_gets_tenant_id_from_context_automatically()
    {
        using (var context = CreateContext(TenantA))
        {
            context.Users.Add(new User { Phone = "5550000099", FirstName = "Yeni" });
            context.SaveChanges();
        }

        using var verify = CreateContext(TenantA);
        var created = verify.Users.Single(u => u.Phone == "5550000099");
        Assert.Equal(TenantA, created.TenantId);
        Assert.True(created.CreatedAt > DateTimeOffset.MinValue);
    }

    [Fact]
    public void Added_entity_without_tenant_context_throws()
    {
        using var context = CreateContext(tenantId: null);
        context.Users.Add(new User { Phone = "5550000098" });

        Assert.Throws<InvalidOperationException>(() => context.SaveChanges());
    }

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
        public Guid RequiredTenantId => TenantId
            ?? throw new InvalidOperationException("Tenant bağlamı yok.");
    }
}
