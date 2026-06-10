using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class CardConfiguration : IEntityTypeConfiguration<Card>
{
    public void Configure(EntityTypeBuilder<Card> builder)
    {
        builder.ToTable("cards");
        builder.HasKey(c => c.Id);

        // Şifreli token — düz token kolonu YOK (ARCHITECTURE §4.2 "şifreli saklama").
        builder.Property(c => c.UserAccountTokenEncrypted)
            .HasColumnName("user_account_token_encrypted")
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(c => c.MaskedCardNo).IsRequired().HasMaxLength(50);
        builder.Property(c => c.HolderName).HasMaxLength(200);

        builder.Property(c => c.Status)
            .HasConversion(EnumConverters.EntityStatusConverter)
            .HasMaxLength(10);

        // ARCHITECTURE §4.2: INDEX(user_id) — kart listeleme kullanıcı bazlıdır.
        builder.HasIndex(c => c.UserId);
        builder.HasIndex(c => c.TenantId);

        builder.HasOne(c => c.Tenant)
            .WithMany()
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PaymentIdempotencyConfiguration : IEntityTypeConfiguration<PaymentIdempotency>
{
    public void Configure(EntityTypeBuilder<PaymentIdempotency> builder)
    {
        builder.ToTable("payment_idempotency");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.IdempotencyKey).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Operation).IsRequired().HasMaxLength(50);
        builder.Property(p => p.RefCode).HasMaxLength(100);
        builder.Property(p => p.Status).IsRequired().HasMaxLength(10);

        // Yanıt anlık görüntüsü (ARCHITECTURE §4.2 response_snapshot jsonb).
        builder.Property(p => p.ResponseSnapshotJson)
            .HasColumnName("response_snapshot")
            .HasColumnType("jsonb");

        // Çift harcama engelinin temeli: aynı anahtar tenant içinde bir kez yazılır
        // (ARCHITECTURE §4.2 UNIQUE(tenant_id, idempotency_key), §5.3).
        builder.HasIndex(p => new { p.TenantId, p.IdempotencyKey }).IsUnique();

        builder.HasOne(p => p.Tenant)
            .WithMany()
            .HasForeignKey(p => p.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SavedRecipientConfiguration : IEntityTypeConfiguration<SavedRecipient>
{
    public void Configure(EntityTypeBuilder<SavedRecipient> builder)
    {
        builder.ToTable("saved_recipients");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Label).IsRequired().HasMaxLength(100);
        builder.Property(r => r.MaskedCardNo).IsRequired().HasMaxLength(50);

        // Şifreli alıcı token'ı — düz token kolonu YOK (ARCHITECTURE §4.2 "şifreli").
        builder.Property(r => r.RecipientTokenEncrypted)
            .HasColumnName("recipient_token_encrypted")
            .IsRequired()
            .HasMaxLength(1000);

        builder.HasIndex(r => r.UserId);
        builder.HasIndex(r => r.TenantId);

        builder.HasOne(r => r.Tenant)
            .WithMany()
            .HasForeignKey(r => r.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
