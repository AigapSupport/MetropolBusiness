using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class AssistantConfiguration : IEntityTypeConfiguration<Assistant>
{
    public void Configure(EntityTypeBuilder<Assistant> builder)
    {
        builder.ToTable("assistants");
        builder.HasKey(a => a.Id);
        builder.HasIndex(a => a.TenantId);

        builder.Property(a => a.Name).IsRequired().HasMaxLength(100);
        builder.Property(a => a.Persona).IsRequired().HasMaxLength(4000);
        builder.Property(a => a.Scope).HasMaxLength(20);
    }
}

public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.ToTable("conversations");
        builder.HasKey(c => c.Id);
        builder.HasIndex(c => c.TenantId);

        builder.Property(c => c.Type)
            .HasConversion(EnumConverters.ConversationTypeConverter)
            .HasMaxLength(20);

        builder.HasOne(c => c.Assistant)
            .WithMany()
            .HasForeignKey(c => c.AssistantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ConversationParticipantConfiguration : IEntityTypeConfiguration<ConversationParticipant>
{
    public void Configure(EntityTypeBuilder<ConversationParticipant> builder)
    {
        builder.ToTable("conversation_participants");
        builder.HasKey(p => new { p.ConversationId, p.UserId });

        builder.HasOne(p => p.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(p => p.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("messages");
        builder.HasKey(m => m.Id);
        builder.HasIndex(m => m.TenantId);
        // Konuşma geçmişi zamana göre listelenir (ARCHITECTURE §4.8 bileşik indeks).
        builder.HasIndex(m => new { m.ConversationId, m.CreatedAt });

        builder.Property(m => m.Content).IsRequired().HasMaxLength(8000);
        builder.Property(m => m.SenderType)
            .HasConversion(EnumConverters.ChatSenderTypeConverter)
            .HasMaxLength(20);
        builder.Property(m => m.ReadByJson)
            .HasColumnName("read_by")
            .HasColumnType("jsonb")
            .HasDefaultValue("[]");

        builder.HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
