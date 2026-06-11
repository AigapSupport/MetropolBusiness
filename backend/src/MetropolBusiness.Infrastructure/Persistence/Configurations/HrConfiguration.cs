using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class LeaveRequestConfiguration : IEntityTypeConfiguration<LeaveRequest>
{
    public void Configure(EntityTypeBuilder<LeaveRequest> builder)
    {
        builder.ToTable("leave_requests");
        builder.HasKey(l => l.Id);
        builder.HasIndex(l => l.TenantId);
        builder.HasIndex(l => l.UserId);

        builder.Property(l => l.Type).IsRequired().HasMaxLength(50);
        builder.Property(l => l.Note).HasMaxLength(1000);
        builder.Property(l => l.DecisionNote).HasMaxLength(1000);
        builder.Property(l => l.Status)
            .HasConversion(EnumConverters.RequestStatusConverter)
            .HasMaxLength(20);

        builder.HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ExpenseRequestConfiguration : IEntityTypeConfiguration<ExpenseRequest>
{
    public void Configure(EntityTypeBuilder<ExpenseRequest> builder)
    {
        builder.ToTable("expense_requests");
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => e.TenantId);
        builder.HasIndex(e => e.UserId);

        builder.Property(e => e.Type).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Amount).HasColumnType("numeric(18,2)");
        builder.Property(e => e.Note).HasMaxLength(1000);
        builder.Property(e => e.DecisionNote).HasMaxLength(1000);
        builder.Property(e => e.Status)
            .HasConversion(EnumConverters.RequestStatusConverter)
            .HasMaxLength(20);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class MerchantFeedbackConfiguration : IEntityTypeConfiguration<MerchantFeedback>
{
    public void Configure(EntityTypeBuilder<MerchantFeedback> builder)
    {
        builder.ToTable("merchant_feedbacks");
        builder.HasKey(f => f.Id);
        builder.HasIndex(f => f.TenantId);

        builder.Property(f => f.MerchantCode).IsRequired().HasMaxLength(20);
        builder.Property(f => f.Message).IsRequired().HasMaxLength(2000);
    }
}
