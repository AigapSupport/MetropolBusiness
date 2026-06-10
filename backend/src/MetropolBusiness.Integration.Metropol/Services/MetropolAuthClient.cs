using System.Net.Http.Json;
using System.Text.Json;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// IMetropolAuthClient HTTP implementasyonu (AuthBaseUrl tarafı — DI'da BaseAddress ayarlanır).
/// Sırlar (AccessKey/AesKey) bu sınıfa gelmez; yalnızca hazır SecureAccessData taşınır.
/// </summary>
public sealed class MetropolAuthClient(HttpClient httpClient) : IMetropolAuthClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<DateTime> GetServerDateAsync(CancellationToken cancellationToken = default)
    {
        // getdate yanıt şeması sözleşme dosyasında tanımlı değil; ham gövde tarih olarak
        // ayrıştırılır (düz "2026-04-01T08:38:40" veya JSON string "\"...\"" biçimleri desteklenir).
        var raw = (await httpClient.GetStringAsync(ApiEndpoints.GetDate, cancellationToken)).Trim();

        if (raw.StartsWith('"'))
        {
            raw = JsonSerializer.Deserialize<string>(raw) ?? string.Empty;
        }

        if (!DateTime.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var serverDate))
        {
            throw new InvalidOperationException("Metropol getdate yanıtı tarih olarak ayrıştırılamadı.");
        }

        return serverDate;
    }

    public async Task<GenerateTokenResponse> GenerateTokenAsync(
        GenerateTokenRequest request, CancellationToken cancellationToken = default)
    {
        using var response = await httpClient.PostAsJsonAsync(
            ApiEndpoints.GenerateToken, request, JsonOptions, cancellationToken);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GenerateTokenResponse>(
            JsonOptions, cancellationToken);

        return result
            ?? throw new InvalidOperationException("Metropol GenerateToken yanıtı boş döndü.");
    }
}
