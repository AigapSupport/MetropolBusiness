using System.Text.Json;
using MetropolBusiness.Application.Auth;
using Microsoft.Extensions.Caching.Distributed;

namespace MetropolBusiness.Infrastructure.Cache;

/// <summary>
/// Pencere tabanlı basit oran sınırlayıcı: anahtar pencere süresince cache'te kalır,
/// varlığı "pencere dolu" demektir (OTP resend — CLAUDE.md §8). Sayaçlı sürüm
/// (maxCount) panel login gibi "pencerede N istek" kuralları içindir.
/// </summary>
public sealed class DistributedCacheRateLimiter(IDistributedCache cache) : IRateLimiter
{
    private const string KeyPrefix = "rl:";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Sayaç zarfı: IDistributedCache kalan TTL'i vermez; artırırken pencere sonunu
    /// koruyabilmek için ExpiresAt birlikte saklanır (DistributedCacheOtpStore deseni).
    /// </summary>
    private sealed record CounterEnvelope(int Count, DateTimeOffset ExpiresAt);

    public async Task<bool> TryAcquireAsync(
        string key, TimeSpan window, CancellationToken cancellationToken = default)
    {
        var cacheKey = KeyPrefix + key;

        var existing = await cache.GetAsync(cacheKey, cancellationToken);
        if (existing is not null)
        {
            return false;
        }

        // Get+Set atomik değil; OTP resend penceresi için nadir yarış kabul edilir.
        // TODO: Redis'e geçince SET NX EX ile atomik edinim.
        await cache.SetAsync(
            cacheKey,
            [1],
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = window },
            cancellationToken);

        return true;
    }

    public async Task<bool> TryAcquireAsync(
        string key, TimeSpan window, int maxCount, CancellationToken cancellationToken = default)
    {
        var cacheKey = KeyPrefix + key;

        var json = await cache.GetStringAsync(cacheKey, cancellationToken);
        var envelope = json is null
            ? null
            : JsonSerializer.Deserialize<CounterEnvelope>(json, JsonOptions);

        if (envelope is null)
        {
            envelope = new CounterEnvelope(1, DateTimeOffset.UtcNow.Add(window));
        }
        else if (envelope.Count >= maxCount)
        {
            return false;
        }
        else
        {
            // Pencere uzatılmaz: aynı ExpiresAt ile yeniden yazılır (sınır kaymaz).
            envelope = envelope with { Count = envelope.Count + 1 };
        }

        // Get+Set atomik değil; nadir yarışta sayaç 1 eksik kalabilir (kabul, tek-edinim notuyla aynı).
        // TODO: Redis'e geçince INCR+EXPIRE ile atomik sayaç.
        await cache.SetStringAsync(
            cacheKey,
            JsonSerializer.Serialize(envelope, JsonOptions),
            new DistributedCacheEntryOptions { AbsoluteExpiration = envelope.ExpiresAt },
            cancellationToken);

        return true;
    }
}
