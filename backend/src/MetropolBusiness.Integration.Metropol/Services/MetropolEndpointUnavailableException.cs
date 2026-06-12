namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// Metropol bir uca HTTP 404 döndüğünde fırlatılır (uç o ortamda mevcut değil —
/// 2026-06-12: sözleşmedeki v2 işlem uçları test sunucusunda yok, LESSONS.md).
/// Middleware bunu 503 PROVIDER_UNAVAILABLE zarfına çevirir; jenerik 500 yerine
/// kullanıcı/istemci ne olduğunu anlar. Mesajda yalnız uç yolu vardır (PII yok).
/// </summary>
public sealed class MetropolEndpointUnavailableException(string endpoint)
    : Exception($"Metropol ucu bu ortamda bulunamadı (404): {endpoint}")
{
    public string Endpoint { get; } = endpoint;
}
