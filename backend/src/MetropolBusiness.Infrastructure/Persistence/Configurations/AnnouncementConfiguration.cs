using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> builder)
    {
        builder.ToTable("announcements");
        builder.HasKey(a => a.Id);

        // TenantId NULLABLE: null = global (platform) duyuru (ARCHITECTURE §4.3/§3.4).
        builder.Property(a => a.TenantId).IsRequired(false);
        builder.HasIndex(a => a.TenantId);

        builder.Property(a => a.Title).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Body).IsRequired();
        builder.Property(a => a.CoverUrl).HasMaxLength(2000);

        builder.Property(a => a.Status)
            .HasConversion(EnumConverters.ContentStatusConverter)
            .HasMaxLength(10);

        builder.HasOne(a => a.Tenant)
            .WithMany()
            .HasForeignKey(a => a.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class AnnouncementSegmentConfiguration : IEntityTypeConfiguration<AnnouncementSegment>
{
    public void Configure(EntityTypeBuilder<AnnouncementSegment> builder)
    {
        builder.ToTable("announcement_segments");
        builder.HasKey(x => new { x.AnnouncementId, x.SegmentId });

        builder.HasOne(x => x.Announcement)
            .WithMany(a => a.Segments)
            .HasForeignKey(x => x.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Segment)
            .WithMany()
            .HasForeignKey(x => x.SegmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
