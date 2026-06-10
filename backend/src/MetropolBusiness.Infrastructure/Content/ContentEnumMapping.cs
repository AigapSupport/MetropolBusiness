using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;

namespace MetropolBusiness.Infrastructure.Content;

/// <summary>
/// İçerik enum ↔ sözleşme string eşlemesi. Tel (API_CONTRACT §3/§12) ve DB (§4.3)
/// aynı sözlüğü kullanır; tek doğru kaynak EnumConverters'tır, burada köprülenir.
/// Parse metotları kullanıcı girdisi için toleranslıdır (null döner, exception atmaz).
/// </summary>
internal static class ContentEnumMapping
{
    public static string StatusToWire(ContentStatus status) =>
        EnumConverters.ContentStatusToDb(status);

    public static ContentStatus? ParseStatus(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "draft" => ContentStatus.Draft,
        "published" => ContentStatus.Published,
        _ => null,
    };

    public static string QuestionTypeToWire(SurveyQuestionType type) =>
        EnumConverters.SurveyQuestionTypeToDb(type);

    public static SurveyQuestionType? ParseQuestionType(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "single" => SurveyQuestionType.Single,
            "multi" => SurveyQuestionType.Multi,
            "text" => SurveyQuestionType.Text,
            "rating" => SurveyQuestionType.Rating,
            _ => null,
        };
}
