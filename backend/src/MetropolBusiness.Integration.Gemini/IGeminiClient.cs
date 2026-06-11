namespace MetropolBusiness.Integration.Gemini;

/// <summary>Sohbet geçmişi satırı: role = "user" | "model" (Gemini sözlüğü).</summary>
public sealed record GeminiTurn(string Role, string Text);

/// <summary>
/// Gemini REST soyutlaması (ARCHITECTURE §8): yalnızca backend çağırır, anahtar
/// backend secret'ıdır. Sistem prompt'una PII konmaz (CLAUDE.md kural 4).
/// </summary>
public interface IGeminiClient
{
    /// <summary>
    /// Asistan cevabı üretir. Sağlayıcı hatasında InvalidOperationException fırlatır —
    /// çağıran katman bunu PROVIDER_UNAVAILABLE'a çevirir.
    /// </summary>
    Task<string> GenerateReplyAsync(
        string systemPrompt, IReadOnlyList<GeminiTurn> history, CancellationToken ct = default);
}
