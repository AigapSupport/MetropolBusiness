using MetropolBusiness.Integration.Metropol.Models;

namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// Metropol auth (token) servisine giden çağrıların soyutlaması (AuthBaseUrl tarafı).
/// HTTP implementasyonu, endpoint sabitleri gerçek MetropolModels.cs (ApiEndpoints)
/// içinde olduğu ve bu dosya henüz sağlanmadığı için YAZILMADI (bkz. LESSONS.md);
/// sözleşme dosyası gelince HttpClient tabanlı implementasyon eklenecek.
/// </summary>
public interface IMetropolAuthClient
{
    /// <summary>
    /// getdate servisinden Metropol sunucu zamanını döner.
    /// İstemci/sunucu saat farkı token'ı erken geçersiz kılabildiğinden
    /// CreateDate olarak bu değer kullanılır (CLAUDE.md §6 saat farkı tuzağı).
    /// </summary>
    Task<string> GetServerDateAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// GenerateToken çağrısı: AES ile şifrelenmiş Base64 SecureAccessData gönderir,
    /// Bearer token + geçerlilik süresini döner.
    /// </summary>
    Task<MetropolTokenResult> GenerateTokenAsync(
        string secureAccessData, CancellationToken cancellationToken = default);
}
