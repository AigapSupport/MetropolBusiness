using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.Integration.Gemini;

/// <summary>
/// Gemini generateContent HTTP istemcisi. API anahtarı yalnızca query parametresinde
/// taşınır; LOG'A, hata mesajına, yanıta yazılmaz (CLAUDE.md kural 2 benzeri sır kuralı).
/// </summary>
public sealed class GeminiClient(HttpClient httpClient, IOptions<GeminiOptions> options)
    : IGeminiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true,
    };

    private readonly GeminiOptions _options = options.Value;

    public async Task<string> GenerateReplyAsync(
        string systemPrompt, IReadOnlyList<GeminiTurn> history, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_options.ApiKey))
        {
            throw new InvalidOperationException("Gemini API anahtarı yapılandırılmamış.");
        }

        var request = new GenerateContentRequest(
            new Content(null, [new Part(systemPrompt)]),
            history.Select(turn => new Content(turn.Role, [new Part(turn.Text)])).ToList());

        // Anahtar URL'de taşınır; bu URL hiçbir log'a yazılmamalıdır.
        var url = $"v1beta/models/{_options.Model}:generateContent?key={Uri.EscapeDataString(_options.ApiKey)}";

        using var response = await httpClient.PostAsJsonAsync(url, request, JsonOptions, ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Gemini isteği başarısız (HTTP {(int)response.StatusCode}).");
        }

        var result = await response.Content.ReadFromJsonAsync<GenerateContentResponse>(JsonOptions, ct);
        var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException("Gemini boş yanıt döndürdü.");
        }

        return text.Trim();
    }

    // ── Tel sözleşmesi (generativelanguage.googleapis.com v1beta) ────────────

    private sealed record Part(string Text);

    private sealed record Content(string? Role, IReadOnlyList<Part> Parts);

    private sealed record GenerateContentRequest(
        [property: JsonPropertyName("systemInstruction")] Content SystemInstruction,
        [property: JsonPropertyName("contents")] IReadOnlyList<Content> Contents);

    private sealed record Candidate(Content? Content);

    private sealed record GenerateContentResponse(IReadOnlyList<Candidate>? Candidates);
}
