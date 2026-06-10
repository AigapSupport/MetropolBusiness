using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Persistence;

/// <summary>
/// Tek DbContext. Tenant izolasyonu iki mekanizmayla zorlanır (ARCHITECTURE §3.3):
/// 1) Global query filter: ITenantOwned entity'ler otomatik TenantId ile filtrelenir.
/// 2) SaveChanges: eklenen ITenantOwned entity'lere TenantId otomatik atanır.
/// Platform admin senaryoları filtreyi yalnızca açık gerekçeyle IgnoreQueryFilters ile aşar.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
    : DbContext(options)
{
    private readonly ITenantContext _tenantContext = tenantContext;

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Segment> Segments => Set<Segment>();
    public DbSet<UserSegment> UserSegments => Set<UserSegment>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<SegmentModule> SegmentModules => Set<SegmentModule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Entity başına tek HasQueryFilter olabilir; tenant + soft-delete birlikte yazılır.
        modelBuilder.Entity<User>()
            .HasQueryFilter(u => u.DeletedAt == null && u.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Segment>()
            .HasQueryFilter(s => s.TenantId == _tenantContext.TenantId);

        // Join tabloları da ebeveynin tenant'ına göre filtrelenir — doğrudan sorgulansalar
        // bile başka tenant'ın bağları sızmaz (Modules platform seviyesidir, bilerek filtresiz).
        modelBuilder.Entity<UserSegment>()
            .HasQueryFilter(us => us.Segment!.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<SegmentModule>()
            .HasQueryFilter(sm => sm.Segment!.TenantId == _tenantContext.TenantId);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditAndTenantRules();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditAndTenantRules();
        return base.SaveChanges();
    }

    private void ApplyAuditAndTenantRules()
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    baseEntity.CreatedAt = now;
                    baseEntity.UpdatedAt = now;
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = now;
                }
            }

            // TenantId otomatik atama: boş bırakıldıysa istek bağlamından alınır.
            // Platform admin tenant-üstü veri yazıyorsa TenantId'yi açıkça vermek zorundadır.
            if (entry.State == EntityState.Added && entry.Entity is ITenantOwned tenantOwned
                && tenantOwned.TenantId == Guid.Empty)
            {
                tenantOwned.TenantId = _tenantContext.RequiredTenantId;
            }
        }
    }
}
