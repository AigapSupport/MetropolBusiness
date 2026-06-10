namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Anket yanıtı (ARCHITECTURE §4.3 survey_responses). UNIQUE(survey_id, user_id):
/// kullanıcı başına tek kayıt — tek seferlik olmayan ankette yeniden yanıt
/// mevcut kaydın üzerine yazılır (upsert), tek seferlikte 409 döner.
/// Tenant izolasyonu ebeveyn Survey üzerinden sağlanır.
/// </summary>
public class SurveyResponse : BaseEntity
{
    public Guid SurveyId { get; set; }
    public Survey? Survey { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Yanıtlar JSON dizisi (jsonb): [{ "questionId": "...", "value": ... }].</summary>
    public string AnswersJson { get; set; } = "[]";
}
