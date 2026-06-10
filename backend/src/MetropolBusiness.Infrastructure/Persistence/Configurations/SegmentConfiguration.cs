using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class SegmentConfiguration : IEntityTypeConfiguration<Segment>
{
    public void Configure(EntityTypeBuilder<Segment> builder)
    {
        builder.ToTable("segments");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name).IsRequired().HasMaxLength(100);
        builder.HasIndex(s => new { s.TenantId, s.Name }).IsUnique();
        builder.HasIndex(s => s.TenantId);

        builder.HasOne(s => s.Tenant)
            .WithMany(t => t.Segments)
            .HasForeignKey(s => s.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class UserSegmentConfiguration : IEntityTypeConfiguration<UserSegment>
{
    public void Configure(EntityTypeBuilder<UserSegment> builder)
    {
        builder.ToTable("user_segments");
        builder.HasKey(us => new { us.UserId, us.SegmentId });

        builder.HasOne(us => us.User)
            .WithMany(u => u.UserSegments)
            .HasForeignKey(us => us.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(us => us.Segment)
            .WithMany(s => s.UserSegments)
            .HasForeignKey(us => us.SegmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
