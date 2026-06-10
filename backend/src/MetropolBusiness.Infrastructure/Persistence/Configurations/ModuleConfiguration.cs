using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class ModuleConfiguration : IEntityTypeConfiguration<Module>
{
    public void Configure(EntityTypeBuilder<Module> builder)
    {
        builder.ToTable("modules");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(m => m.Code).IsUnique();
        builder.Property(m => m.Name).IsRequired().HasMaxLength(100);
    }
}

public class SegmentModuleConfiguration : IEntityTypeConfiguration<SegmentModule>
{
    public void Configure(EntityTypeBuilder<SegmentModule> builder)
    {
        builder.ToTable("segment_modules");
        builder.HasKey(sm => new { sm.SegmentId, sm.ModuleId });

        builder.HasOne(sm => sm.Segment)
            .WithMany(s => s.SegmentModules)
            .HasForeignKey(sm => sm.SegmentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sm => sm.Module)
            .WithMany(m => m.SegmentModules)
            .HasForeignKey(sm => sm.ModuleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
