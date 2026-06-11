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
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<AnnouncementSegment> AnnouncementSegments => Set<AnnouncementSegment>();
    public DbSet<Survey> Surveys => Set<Survey>();
    public DbSet<SurveyQuestion> SurveyQuestions => Set<SurveyQuestion>();
    public DbSet<SurveyResponse> SurveyResponses => Set<SurveyResponse>();
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<VideoWatch> VideoWatches => Set<VideoWatch>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<CardBalance> CardBalances => Set<CardBalance>();
    public DbSet<PaymentIdempotency> PaymentIdempotencies => Set<PaymentIdempotency>();
    public DbSet<SavedRecipient> SavedRecipients => Set<SavedRecipient>();

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

        // Duyuru ÖZEL filtre (ARCHITECTURE §3.4): TenantId null = platform/global içerik,
        // HER tenant'a görünür; dolu ise yalnızca o tenant'a. ITenantOwned değildir!
        modelBuilder.Entity<Announcement>()
            .HasQueryFilter(a => a.TenantId == null || a.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<AnnouncementSegment>()
            .HasQueryFilter(x =>
                x.Announcement!.TenantId == null || x.Announcement!.TenantId == _tenantContext.TenantId);

        // Anket/video tenant filtreli; çocuk tablolar ebeveynin tenant'ı üzerinden filtrelenir.
        modelBuilder.Entity<Survey>()
            .HasQueryFilter(s => s.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<SurveyQuestion>()
            .HasQueryFilter(q => q.Survey!.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<SurveyResponse>()
            .HasQueryFilter(r => r.Survey!.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Video>()
            .HasQueryFilter(v => v.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<VideoWatch>()
            .HasQueryFilter(w => w.Video!.TenantId == _tenantContext.TenantId);

        // Kart & ödeme tabloları (TODO 1.4/1.5): tenant filtreli; kart ayrıca soft-delete'li —
        // silinen kart bağı hiçbir sorguda görünmez (PRD §8.8 "yalnızca kart bağı kaldırılır").
        modelBuilder.Entity<Card>()
            .HasQueryFilter(c => c.DeletedAt == null && c.TenantId == _tenantContext.TenantId);
        // Bakiye snapshot'ı (KARAR 2026-06-11): çocuk tablo ebeveyn kartın tenant'ı
        // üzerinden filtrelenir (VideoWatch/SurveyQuestion deseni) — doğrudan sorgulansa
        // bile başka tenant'ın kartının snapshot'ı sızmaz.
        modelBuilder.Entity<CardBalance>()
            .HasQueryFilter(cb => cb.Card!.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<PaymentIdempotency>()
            .HasQueryFilter(p => p.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<SavedRecipient>()
            .HasQueryFilter(r => r.TenantId == _tenantContext.TenantId);
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
