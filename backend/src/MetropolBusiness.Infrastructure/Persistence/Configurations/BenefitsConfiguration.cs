using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class CampaignCategoryConfiguration : IEntityTypeConfiguration<CampaignCategory>
{
    public void Configure(EntityTypeBuilder<CampaignCategory> builder)
    {
        builder.ToTable("campaign_categories");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Code).IsRequired().HasMaxLength(50);
        builder.HasIndex(c => c.Code).IsUnique();
        builder.Property(c => c.Name).IsRequired().HasMaxLength(100);
    }
}

public class CampaignConfiguration : IEntityTypeConfiguration<Campaign>
{
    public void Configure(EntityTypeBuilder<Campaign> builder)
    {
        builder.ToTable("campaigns");
        builder.HasKey(c => c.Id);
        builder.HasIndex(c => c.TenantId);

        builder.Property(c => c.Title).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Status)
            .HasConversion(EnumConverters.ContentStatusConverter)
            .HasMaxLength(20);

        builder.HasOne(c => c.Category)
            .WithMany(cat => cat.Campaigns)
            .HasForeignKey(c => c.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Tenant)
            .WithMany()
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class CouponConfiguration : IEntityTypeConfiguration<Coupon>
{
    public void Configure(EntityTypeBuilder<Coupon> builder)
    {
        builder.ToTable("coupons");
        builder.HasKey(c => c.Id);
        builder.HasIndex(c => c.TenantId);

        builder.Property(c => c.Title).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Brand).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Amount).HasColumnType("numeric(18,2)");
        builder.Property(c => c.Status)
            .HasConversion(EnumConverters.ContentStatusConverter)
            .HasMaxLength(20);
    }
}

public class GiftCardConfiguration : IEntityTypeConfiguration<GiftCard>
{
    public void Configure(EntityTypeBuilder<GiftCard> builder)
    {
        builder.ToTable("gift_cards");
        builder.HasKey(g => g.Id);
        builder.HasIndex(g => g.TenantId);

        builder.Property(g => g.Title).IsRequired().HasMaxLength(200);
        builder.Property(g => g.Brand).IsRequired().HasMaxLength(100);
        builder.Property(g => g.Amount).HasColumnType("numeric(18,2)");
        builder.Property(g => g.Status)
            .HasConversion(EnumConverters.ContentStatusConverter)
            .HasMaxLength(20);
    }
}
