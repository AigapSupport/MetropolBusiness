using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// Metropol auth (token) servisine giden çağrıların soyutlaması (AuthBaseUrl tarafı).
/// Sözleşme: MetropolModels.cs (ApiEndpoints.GenerateToken / GetDate).
/// </summary>
public interface IMetropolAuthClient
{
    /// <summary>
    /// getdate servisinden Metropol sunucu zamanını döner.
    /// İstemci/sunucu saat farkı token'ı erken geçersiz kılabildiğinden
    /// AccessData.CreateDate olarak bu değer kullanılır (CLAUDE.md §6 saat farkı tuzağı).
    /// </summary>
    Task<DateTime> GetServerDateAsync(CancellationToken cancellationToken = default);

    /// <summary>GenerateToken çağrısı — Bearer token + mutlak geçerlilik zamanı döner.</summary>
    Task<GenerateTokenResponse> GenerateTokenAsync(
        GenerateTokenRequest request, CancellationToken cancellationToken = default);
}
