using MetropolBusiness.Application.Auth;
using Microsoft.Extensions.Caching.Distributed;

namespace MetropolBusiness.Infrastructure.Cache;

/// <summary>
/// Pencere tabanlı basit oran sınırlayıcı: anahtar pencere süresince cache'te kalır,
/// varlığı "pencere dolu" demektir (OTP resend — CLAUDE.md §8).
/// </summary>
public sealed class DistributedCacheRateLimiter(IDistributedCache cache) : IRateLimiter
{
    private const string KeyPrefix = "rl:";

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
}
