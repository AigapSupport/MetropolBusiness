using MetropolBusiness.Application.Auth;
using Microsoft.Extensions.Caching.Distributed;

namespace MetropolBusiness.Infrastructure.Cache;

/// <summary>
/// Refresh token hash → kullanıcı eşlemesi IDistributedCache üzerinde tutulur.
/// Ham token asla gelmez; anahtar SHA256 hash'tir (IRefreshTokenStore sözleşmesi).
/// </summary>
public sealed class DistributedCacheRefreshTokenStore(IDistributedCache cache) : IRefreshTokenStore
{
    private const string KeyPrefix = "refresh:";

    public Task StoreAsync(
        string tokenHash, Guid userId, TimeSpan ttl, CancellationToken cancellationToken = default) =>
        cache.SetStringAsync(
            KeyPrefix + tokenHash,
            userId.ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
            cancellationToken);

    public async Task<Guid?> TakeAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        var key = KeyPrefix + tokenHash;

        var value = await cache.GetStringAsync(key, cancellationToken);
        if (value is null)
        {
            return null;
        }

        // Rotasyon niyeti: oku+sil. IDistributedCache atomik GETDEL sunmadığı için basit
        // get+remove kullanılır; nadir yarışta iki istek aynı token'ı tüketebilir.
        // TODO: Redis'e geçince Lua/GETDEL ile gerçek atomik tüketim.
        await cache.RemoveAsync(key, cancellationToken);

        return Guid.TryParse(value, out var userId) ? userId : null;
    }
}
