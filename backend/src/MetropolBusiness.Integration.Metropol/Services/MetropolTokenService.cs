using System.Text.Json;
using MetropolBusiness.Integration.Metropol.Crypto;
using MetropolBusiness.Integration.Metropol.Models;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// Metropol token üretimi + cache (ARCHITECTURE §5.1, CLAUDE.md §6):
/// token her istekte yeniden üretilmez; IDistributedCache'te (Redis.Enabled=true → Redis)
/// TokenRefreshThresholdSeconds (varsayılan 240 sn) TTL ile tutulur — token 5 dk geçerli,
/// 4 dk eşikte yenilenir. Eşzamanlı yenileme yarışı process-içi SemaphoreSlim ile engellenir
/// (single-flight); çok-instance dağıtımda Redis dağıtık kilit İLERİDE eklenecek —
/// o güne kadar en kötü durumda instance başına bir üretim olur (zararsız, çift harcama riski yok).
/// AccessKey/AesKey hiçbir log'a, hata mesajına, yanıta yazılmaz (CLAUDE.md kural 2).
/// </summary>
public sealed class MetropolTokenService(
    IMetropolAuthClient authClient,
    IDistributedCache cache,
    IOptions<MetropolOptions> options,
    TimeProvider timeProvider)
{
    /// <summary>Metropol token'ı tenant-üstüdür (platform kimliği) — tek ortak anahtar yeterli.</summary>
    private const string CacheKey = "metropol:token";

    /// <summary>Process-içi single-flight kilidi (tüm scope'lar paylaşır).</summary>
    private static readonly SemaphoreSlim RefreshGate = new(1, 1);

    private readonly MetropolOptions _options = options.Value;

    /// <summary>
    /// Geçerli Metropol Bearer token'ını döner: cache'te varsa oradan,
    /// yoksa single-flight içinde getdate → AccessData → AES/Base64 → GenerateToken akışıyla üretir.
    /// </summary>
    public async Task<string> GetTokenAsync(CancellationToken cancellationToken = default)
    {
        var cachedToken = await cache.GetStringAsync(CacheKey, cancellationToken);
        if (!string.IsNullOrEmpty(cachedToken))
        {
            return cachedToken;
        }

        await RefreshGate.WaitAsync(cancellationToken);
        try
        {
            // Kilidi bekleyen diğer çağrılar için ikinci kontrol: ilk giren üretip yazdıysa
            // upstream'e tekrar gidilmez (single-flight).
            cachedToken = await cache.GetStringAsync(CacheKey, cancellationToken);
            if (!string.IsNullOrEmpty(cachedToken))
            {
                return cachedToken;
            }

            var result = await GenerateAsync(cancellationToken);
            await CacheTokenAsync(result, cancellationToken);
            return result.Token;
        }
        finally
        {
            RefreshGate.Release();
        }
    }

    private async Task<MetropolTokenResult> GenerateAsync(CancellationToken cancellationToken)
    {
        // Saat farkı tuzağı: CreateDate yerel saatten değil getdate'ten alınır (CLAUDE.md §6).
        var serverDate = await authClient.GetServerDateAsync(cancellationToken);

        // VARSAYIM: JSON alan adları PascalCase; gerçek MetropolModels.cs gelince teyit edilecek.
        var accessDataJson = JsonSerializer.Serialize(new AccessData(_options.AccessKey, serverDate));
        var secureAccessData = AesEncryptionHelper.Encrypt(accessDataJson, _options.AesKey);

        return await authClient.GenerateTokenAsync(secureAccessData, cancellationToken);
    }

    private Task CacheTokenAsync(MetropolTokenResult result, CancellationToken cancellationToken)
    {
        // TTL = yenileme eşiği; upstream daha kısa ömür bildirirse o esas alınır (bayat token verilmez).
        var ttlSeconds = Math.Min(_options.TokenRefreshThresholdSeconds, result.ExpirationSeconds);
        if (ttlSeconds <= 0)
        {
            return Task.CompletedTask;
        }

        return cache.SetStringAsync(
            CacheKey,
            result.Token,
            new DistributedCacheEntryOptions
            {
                AbsoluteExpiration = timeProvider.GetUtcNow().AddSeconds(ttlSeconds),
            },
            cancellationToken);
    }
}
