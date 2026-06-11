using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("audit_logs");
        builder.HasKey(a => a.Id);
        builder.HasIndex(a => a.TenantId);
        // Liste zaman + eylem filtreli sorgulanır (PANELS_SPEC B.8).
        builder.HasIndex(a => new { a.Action, a.CreatedAt });

        builder.Property(a => a.Action).IsRequired().HasMaxLength(100);
        builder.Property(a => a.Entity).IsRequired().HasMaxLength(50);
        builder.Property(a => a.EntityId).IsRequired().HasMaxLength(100);
        builder.Property(a => a.MetadataJson)
            .HasColumnName("metadata")
            .HasColumnType("jsonb")
            .HasDefaultValue("{}");
    }
}
