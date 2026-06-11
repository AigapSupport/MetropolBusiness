namespace MetropolBusiness.Integration.Gemini;

/// <summary>
/// Gemini ayarları. ApiKey SIRDIR: yalnızca backend'de, environment/secret store'dan
/// okunur; istemciye asla gitmez (CLAUDE.md kural 2-3, ARCHITECTURE §8).
/// </summary>
public sealed class GeminiOptions
{
    public const string SectionName = "Gemini";

    public string ApiKey { get; init; } = string.Empty;
    public string Model { get; init; } = "gemini-2.0-flash";

    /// <summary>generateContent base URL'i — testte sahte sunucuya yönlendirilebilir.</summary>
    public string BaseUrl { get; init; } = "https://generativelanguage.googleapis.com";
}
