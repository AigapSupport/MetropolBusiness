using System.Text.Json;
using MetropolBusiness.Application.Auth;
using Microsoft.Extensions.Caching.Distributed;

namespace MetropolBusiness.Infrastructure.Cache;

/// <summary>
/// OTP kayıtları IDistributedCache üzerinde tutulur (Redis.Enabled=true → Redis,
/// değilse in-memory). Kod yalnızca SHA256 hash olarak gelir (IOtpStore sözleşmesi);
/// anahtar/değer hiçbir log'a yazılmaz (CLAUDE.md kural 4).
/// </summary>
public sealed class DistributedCacheOtpStore(IDistributedCache cache) : IOtpStore
{
    private const string KeyPrefix = "otp:";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Cache zarfı: IDistributedCache kalan TTL'i vermez; attempts güncellenirken
    /// son kullanım anını koruyabilmek için ExpiresAt birlikte saklanır.
    /// </summary>
    private sealed record CacheEnvelope(OtpEntry Entry, DateTimeOffset ExpiresAt);

    public Task StoreAsync(
        string otpRef, OtpEntry entry, TimeSpan ttl, CancellationToken cancellationToken = default) =>
        SetAsync(otpRef, new CacheEnvelope(entry, DateTimeOffset.UtcNow.Add(ttl)), cancellationToken);

    public async Task<OtpEntry?> GetAsync(string otpRef, CancellationToken cancellationToken = default)
    {
        var envelope = await GetEnvelopeAsync(otpRef, cancellationToken);
        return envelope?.Entry;
    }

    public async Task<int> IncrementAttemptsAsync(string otpRef, CancellationToken cancellationToken = default)
    {
        var envelope = await GetEnvelopeAsync(otpRef, cancellationToken);
        if (envelope is null)
        {
            return 0;
        }

        // TTL uzatılmaz: aynı ExpiresAt ile yeniden yazılır (kilit penceresi kaymaz).
        var updated = envelope with { Entry = envelope.Entry with { Attempts = envelope.Entry.Attempts + 1 } };
        await SetAsync(otpRef, updated, cancellationToken);
        return updated.Entry.Attempts;
    }

    public Task RemoveAsync(string otpRef, CancellationToken cancellationToken = default) =>
        cache.RemoveAsync(KeyPrefix + otpRef, cancellationToken);

    private async Task<CacheEnvelope?> GetEnvelopeAsync(string otpRef, CancellationToken cancellationToken)
    {
        var json = await cache.GetStringAsync(KeyPrefix + otpRef, cancellationToken);
        return json is null ? null : JsonSerializer.Deserialize<CacheEnvelope>(json, JsonOptions);
    }

    private Task SetAsync(string otpRef, CacheEnvelope envelope, CancellationToken cancellationToken) =>
        cache.SetStringAsync(
            KeyPrefix + otpRef,
            JsonSerializer.Serialize(envelope, JsonOptions),
            new DistributedCacheEntryOptions { AbsoluteExpiration = envelope.ExpiresAt },
            cancellationToken);
}
