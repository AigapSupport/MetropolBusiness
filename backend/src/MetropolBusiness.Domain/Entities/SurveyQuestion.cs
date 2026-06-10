using MetropolBusiness.Domain.Enums;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Anket sorusu (ARCHITECTURE §4.3 survey_questions). Tenant izolasyonu
/// ebeveyn Survey üzerinden sağlanır (AppDbContext query filter).
/// </summary>
public class SurveyQuestion : BaseEntity
{
    public Guid SurveyId { get; set; }
    public Survey? Survey { get; set; }

    /// <summary>Soru sırası (1'den başlar).</summary>
    public int Order { get; set; }

    public SurveyQuestionType Type { get; set; }

    public string Text { get; set; } = string.Empty;

    /// <summary>Seçenekler JSON dizisi (jsonb) — single/multi tiplerinde dolu, text/rating'de null.</summary>
    public string? OptionsJson { get; set; }
}
