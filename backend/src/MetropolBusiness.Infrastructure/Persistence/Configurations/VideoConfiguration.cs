using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class VideoConfiguration : IEntityTypeConfiguration<Video>
{
    public void Configure(EntityTypeBuilder<Video> builder)
    {
        builder.ToTable("videos");
        builder.HasKey(v => v.Id);

        builder.Property(v => v.Title).IsRequired().HasMaxLength(200);
        builder.Property(v => v.Url).IsRequired().HasMaxLength(2000);
        builder.Property(v => v.ThumbnailUrl).HasMaxLength(2000);
        builder.HasIndex(v => v.TenantId);

        builder.HasOne(v => v.Tenant)
            .WithMany()
            .HasForeignKey(v => v.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class VideoWatchConfiguration : IEntityTypeConfiguration<VideoWatch>
{
    public void Configure(EntityTypeBuilder<VideoWatch> builder)
    {
        builder.ToTable("video_watches");
        builder.HasKey(w => w.Id);

        // Kullanıcı başına tek izleme kaydı — upsert (ARCHITECTURE §4.3 UNIQUE(video_id, user_id)).
        builder.HasIndex(w => new { w.VideoId, w.UserId }).IsUnique();

        builder.HasOne(w => w.Video)
            .WithMany(v => v.Watches)
            .HasForeignKey(w => w.VideoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.User)
            .WithMany()
            .HasForeignKey(w => w.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
