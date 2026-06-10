using MetropolBusiness.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MetropolBusiness.Infrastructure.Persistence.Configurations;

public class SurveyConfiguration : IEntityTypeConfiguration<Survey>
{
    public void Configure(EntityTypeBuilder<Survey> builder)
    {
        builder.ToTable("surveys");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Title).IsRequired().HasMaxLength(200);
        builder.HasIndex(s => s.TenantId);

        builder.Property(s => s.Status)
            .HasConversion(EnumConverters.ContentStatusConverter)
            .HasMaxLength(10);

        builder.HasOne(s => s.Tenant)
            .WithMany()
            .HasForeignKey(s => s.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SurveyQuestionConfiguration : IEntityTypeConfiguration<SurveyQuestion>
{
    public void Configure(EntityTypeBuilder<SurveyQuestion> builder)
    {
        builder.ToTable("survey_questions");
        builder.HasKey(q => q.Id);

        builder.HasIndex(q => new { q.SurveyId, q.Order });

        builder.Property(q => q.Text).IsRequired();

        builder.Property(q => q.Type)
            .HasConversion(EnumConverters.SurveyQuestionTypeConverter)
            .HasMaxLength(10);

        // Seçenekler JSON dizisi; text/rating sorularında null (ARCHITECTURE §4.3 options jsonb).
        builder.Property(q => q.OptionsJson)
            .HasColumnName("options")
            .HasColumnType("jsonb");

        builder.HasOne(q => q.Survey)
            .WithMany(s => s.Questions)
            .HasForeignKey(q => q.SurveyId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SurveyResponseConfiguration : IEntityTypeConfiguration<SurveyResponse>
{
    public void Configure(EntityTypeBuilder<SurveyResponse> builder)
    {
        builder.ToTable("survey_responses");
        builder.HasKey(r => r.Id);

        // Kullanıcı başına tek yanıt kaydı (ARCHITECTURE §4.3 UNIQUE(survey_id, user_id)).
        builder.HasIndex(r => new { r.SurveyId, r.UserId }).IsUnique();

        builder.Property(r => r.AnswersJson)
            .HasColumnName("answers")
            .HasColumnType("jsonb")
            .IsRequired();

        builder.HasOne(r => r.Survey)
            .WithMany(s => s.Responses)
            .HasForeignKey(r => r.SurveyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
