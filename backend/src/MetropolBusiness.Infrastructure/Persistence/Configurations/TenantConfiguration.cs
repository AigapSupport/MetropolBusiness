using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Name).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(t => t.Code).IsUnique();

        builder.Property(t => t.Status)
            .HasConversion(EnumConverters.TenantStatusConverter)
            .HasMaxLength(20);

        builder.Property(t => t.MetropolConsumerRef).HasMaxLength(200);
        builder.Property(t => t.BrandPrimaryColor).HasMaxLength(20);
        builder.Property(t => t.BrandSecondaryColor).HasMaxLength(20);

        builder.Property(t => t.SettingsJson)
            .HasColumnName("settings")
            .HasColumnType("jsonb")
            .HasDefaultValue("{}");
    }
}
