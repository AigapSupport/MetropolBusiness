using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Phone).IsRequired().HasMaxLength(20);
        // Telefon tenant içinde benzersiz (ARCHITECTURE §4.1: UNIQUE(tenant_id, phone)).
        builder.HasIndex(u => new { u.TenantId, u.Phone }).IsUnique();
        builder.HasIndex(u => u.TenantId);

        builder.Property(u => u.FirstName).HasMaxLength(100);
        builder.Property(u => u.LastName).HasMaxLength(100);
        builder.Property(u => u.Email).HasMaxLength(254);
        builder.Property(u => u.City).HasMaxLength(100);
        builder.Property(u => u.MemberId).HasMaxLength(50);

        // Şifreli TCKN — düz metin kolon yok (CLAUDE.md kural 4).
        builder.Property(u => u.TcknEncrypted).HasColumnName("tckn_encrypted").HasMaxLength(500);

        // Panel girişi şifre hash'i (PBKDF2 biçimli string) — yalnız panel kullanıcılarında dolu.
        builder.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(500);

        // Bildirim/izin tercihleri (API_CONTRACT §2 /me/preferences) — Tenant.SettingsJson deseni.
        builder.Property(u => u.PreferencesJson)
            .HasColumnName("preferences")
            .HasColumnType("jsonb")
            .HasDefaultValue("{}");

        builder.Property(u => u.Role)
            .HasConversion(EnumConverters.UserRoleConverter)
            .HasMaxLength(20);

        builder.Property(u => u.Status)
            .HasConversion(EnumConverters.EntityStatusConverter)
            .HasMaxLength(10);

        builder.HasOne(u => u.Tenant)
            .WithMany(t => t.Users)
            .HasForeignKey(u => u.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
