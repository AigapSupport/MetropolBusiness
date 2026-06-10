using System.Text.Json;
using MetropolBusiness.Integration.Metropol;
using MetropolBusiness.Integration.Metropol.Crypto;
using MetropolBusiness.Integration.Metropol.Models;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.UnitTests.Metropol;

/// <summary>
/// MetropolTokenService (ARCHITECTURE §5.1): cache'ten dönüş, upstream'e tek gidiş,
/// paralel çağrıda single-flight, SecureAccessData'nın doğru AES/Base64 ile üretimi.
/// Fake IMetropolAuthClient + MemoryDistributedCache + sabit TimeProvider.
/// </summary>
public sealed class MetropolTokenServiceTests
{
    private const string AesKey = "0123456789abcdef"; // UTF-8'de tam 16 bayt
    private const string AccessKey = "test-access-key";
    private const string ServerDate = "2026-06-10T13:19:00";

    private readonly FakeMetropolAuthClient _authClient = new();
    private readonly MemoryDistributedCache _cache =
        new(Options.Create(new MemoryDistributedCacheOptions()));
    private readonly MetropolTokenService _service;

    public MetropolTokenServiceTests()
    {
        var options = new MetropolOptions
        {
            AccessKey = AccessKey,
            AesKey = AesKey,
            TokenRefreshThresholdSeconds = 240,
        };

        // Sabit saat: MemoryDistributedCache gerçek saatle süre düşürür; girdilerin test boyunca
        // canlı kalması için sabit an "şimdi" alınır (TTL 240 sn → test süresince dolmaz).
        _service = new MetropolTokenService(
            _authClient, _cache, Options.Create(options), new FixedTimeProvider(DateTimeOffset.UtcNow));
    }

    // ── (a) İlk çağrı upstream'e gider ve cache'lenir ───────────────────────

    [Fact]
    public async Task First_call_generates_token_and_caches_it()
    {
        var token = await _service.GetTokenAsync();

        Assert.Equal("metropol-token-1", token);
        Assert.Equal(1, _authClient.GetServerDateCalls);
        Assert.Equal(1, _authClient.GenerateTokenCalls);
        Assert.Equal(token, await _cache.GetStringAsync("metropol:token"));
    }

    // ── (b) İkinci çağrı upstream'e gitmez ──────────────────────────────────

    [Fact]
    public async Task Second_call_is_served_from_cache_without_upstream_call()
    {
        var first = await _service.GetTokenAsync();
        var second = await _service.GetTokenAsync();

        Assert.Equal(first, second);
        Assert.Equal(1, _authClient.GenerateTokenCalls);
        Assert.Equal(1, _authClient.GetServerDateCalls);
    }

    // ── (c) 10 paralel çağrı → tek upstream çağrısı (single-flight) ─────────

    [Fact]
    public async Task Ten_parallel_calls_hit_upstream_only_once()
    {
        _authClient.GenerateDelay = TimeSpan.FromMilliseconds(50); // yarış penceresini genişlet

        var tokens = await Task.WhenAll(
            Enumerable.Range(0, 10).Select(_ => Task.Run(() => _service.GetTokenAsync())));

        Assert.All(tokens, token => Assert.Equal("metropol-token-1", token));
        Assert.Equal(1, _authClient.GenerateTokenCalls);
    }

    // ── (d) SecureAccessData: Base64 + doğru AES ile çözülebilir ────────────

    [Fact]
    public async Task SecureAccessData_is_base64_and_decrypts_to_access_data()
    {
        await _service.GetTokenAsync();

        var secureAccessData = Assert.IsType<string>(_authClient.LastSecureAccessData);
        Convert.FromBase64String(secureAccessData); // geçerli Base64 değilse fırlatır

        var json = AesEncryptionHelper.Decrypt(secureAccessData, AesKey);
        var accessData = JsonSerializer.Deserialize<AccessData>(json);

        Assert.NotNull(accessData);
        Assert.Equal(AccessKey, accessData.AccessKey);
        // Saat farkı tuzağı: CreateDate yerel saat değil, getdate'ten dönen sunucu zamanı olmalı.
        Assert.Equal(ServerDate, accessData.CreateDate);
    }

    // ── Fake'ler ─────────────────────────────────────────────────────────────

    private sealed class FakeMetropolAuthClient : IMetropolAuthClient
    {
        private int _getServerDateCalls;
        private int _generateTokenCalls;

        public int GetServerDateCalls => _getServerDateCalls;
        public int GenerateTokenCalls => _generateTokenCalls;
        public string? LastSecureAccessData { get; private set; }
        public TimeSpan GenerateDelay { get; set; } = TimeSpan.Zero;

        public Task<string> GetServerDateAsync(CancellationToken cancellationToken = default)
        {
            Interlocked.Increment(ref _getServerDateCalls);
            return Task.FromResult(ServerDate);
        }

        public async Task<MetropolTokenResult> GenerateTokenAsync(
            string secureAccessData, CancellationToken cancellationToken = default)
        {
            var callNo = Interlocked.Increment(ref _generateTokenCalls);
            LastSecureAccessData = secureAccessData;

            if (GenerateDelay > TimeSpan.Zero)
            {
                await Task.Delay(GenerateDelay, cancellationToken);
            }

            return new MetropolTokenResult($"metropol-token-{callNo}", 300);
        }
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
