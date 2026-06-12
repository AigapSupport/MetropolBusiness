using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Cards;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Security;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.UnitTests.Cards;

/// <summary>
/// Bakiye & işlem senaryoları (TODO 1.5 backend, API_CONTRACT §6): bakiye ~30 sn
/// cache'lenir (refresh=true atlar), başka tenant'ın kartına istek NOT_FOUND (izolasyon),
/// işlemlerde isim maskelenir + tutar işaretli string + bellekte sayfalama.
/// KARAR 2026-06-11 senaryoları: başarılı sorgu card_balances'a UPSERT (çoğalma yok),
/// erişilemezlikte snapshot stale=true + doğru asOf, snapshot yokken eski hata davranışı,
/// başka tenant'ın snapshot'ına erişim yok.
/// SQLite in-memory AppDbContext + MemoryDistributedCache + kayıt eden fake client.
/// </summary>
public sealed class BalanceServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string CardAToken = "PLAIN-TOKEN-CARD-A";

    private readonly SqliteConnection _connection;
    private readonly PlaceholderFieldCipher _cipher = new();
    private readonly FakeMetropolApiClient _metropol = new();

    /// <summary>Cache servis örnekleri arasında paylaşılır (gerçek dağıtık cache gibi).</summary>
    private readonly MemoryDistributedCache _cache = new(
        Options.Create(new MemoryDistributedCacheOptions()));

    private readonly Guid _userA1 = Guid.NewGuid();
    private readonly Guid _userB1 = Guid.NewGuid();

    private readonly Guid _cardA = Guid.NewGuid(); // tenant A, userA1
    private readonly Guid _cardB = Guid.NewGuid(); // tenant B, userB1

    public BalanceServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "Firma A", Code = "AAA", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "Firma B", Code = "BBB", Status = TenantStatus.Active });

        seed.Users.AddRange(
            new User { Id = _userA1, TenantId = TenantA, Phone = "5550000001" },
            new User { Id = _userB1, TenantId = TenantB, Phone = "5550000002" });

        seed.Cards.AddRange(
            new Card
            {
                Id = _cardA,
                TenantId = TenantA,
                UserId = _userA1,
                UserAccountTokenEncrypted = _cipher.Encrypt(CardAToken),
                MaskedCardNo = "637******976",
            },
            new Card
            {
                Id = _cardB,
                TenantId = TenantB,
                UserId = _userB1,
                UserAccountTokenEncrypted = _cipher.Encrypt("PLAIN-TOKEN-CARD-B"),
                MaskedCardNo = "555******111",
            });

        seed.SaveChanges();
    }

    // ── GET /balance: cüzdan eşlemesi + toplam (para string, CLAUDE.md kural 3) ──

    [Fact]
    public async Task Balance_maps_wallets_and_total_as_money_strings()
    {
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetBalanceAsync(_cardA, walletId: null, forceRefresh: false);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Wallets.Count);
        Assert.Equal("30824.00", result.Value.Wallets[0].Balance);
        Assert.Equal("RESTO", result.Value.Wallets[0].WalletName);
        Assert.Equal("75405.00", result.Value.TotalBalance);

        // Upstream isteği: ÇÖZÜLMÜŞ token + token türü (2) + tüm cüzdanlar (0) —
        // MetropolDefaults belgesiz semantik varsayımları.
        var call = Assert.Single(_metropol.BalanceCalls);
        Assert.Equal(CardAToken, call.UserRefNo);
        Assert.Equal(MetropolDefaults.TokenUserRefType, call.UserRefType);
        Assert.Equal(MetropolDefaults.AllWalletsId, call.WalletId);
    }

    [Fact]
    public async Task Balance_wallet_filter_returns_single_wallet()
    {
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetBalanceAsync(_cardA, walletId: 3, forceRefresh: false);

        Assert.True(result.IsSuccess);
        var wallet = Assert.Single(result.Value.Wallets);
        Assert.Equal(3, wallet.WalletId);
        Assert.Equal("GIFT", wallet.WalletName);
        Assert.Equal("44581.00", result.Value.TotalBalance);
    }

    // ── (d) Bakiye 30 sn cache: ikinci çağrı upstream'e gitmez, refresh gider ──

    [Fact]
    public async Task Balance_second_call_served_from_cache_and_refresh_bypasses()
    {
        var service = CreateBalanceService(TenantA, _userA1);

        var first = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);
        var second = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value.TotalBalance, second.Value.TotalBalance);
        Assert.Single(_metropol.BalanceCalls); // ikinci çağrı cache'ten

        // Manuel yenileme (kart üstündeki yenile ikonu): refresh=true cache'i atlar.
        var refreshed = await service.GetBalanceAsync(_cardA, null, forceRefresh: true);
        Assert.True(refreshed.IsSuccess);
        Assert.Equal(2, _metropol.BalanceCalls.Count);
    }

    // ── (b) İzolasyon: başka tenant'ın kartına bakiye isteği NOT_FOUND ────────

    [Fact]
    public async Task Balance_for_other_tenants_card_returns_not_found_without_upstream_call()
    {
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetBalanceAsync(_cardB, null, forceRefresh: false);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
        Assert.Equal(404, result.Error.HttpStatus);
        Assert.Empty(_metropol.BalanceCalls); // sahiplik doğrulanmadan Metropol'e gidilmez
    }

    [Fact]
    public async Task Balance_metropol_error_maps_to_catalog_message()
    {
        _metropol.NextBalanceResponse.ResponseCode = 7085;
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, result.Error!.Code);
        Assert.Equal(MetropolErrorCatalog.GetMessage(7085), result.Error.Message);
    }

    // ── KARAR 2026-06-11: bakiye snapshot'ı card_balances'ta tutulur ─────────

    // (a) Başarılı sorgu DB'ye snapshot yazar; ikinci sorgu satır ÇOĞALTMAZ, günceller.
    [Fact]
    public async Task Balance_success_upserts_snapshot_without_duplicating_rows()
    {
        var service = CreateBalanceService(TenantA, _userA1);

        var first = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);
        Assert.True(first.IsSuccess);
        Assert.False(first.Value.Stale);
        Assert.NotNull(first.Value.AsOf); // asOf = senkron anı (taze yanıtta da dolu)

        using (var verify = CreateContext(TenantA, _userA1))
        {
            var rows = verify.CardBalances.AsNoTracking()
                .Where(cb => cb.CardId == _cardA).ToList();
            Assert.Equal(2, rows.Count);
            Assert.Equal(30824.00m, rows.Single(r => r.WalletId == 1).Balance);
            Assert.Equal("RESTO", rows.Single(r => r.WalletId == 1).WalletName);
        }

        // İkinci TAZE sorgu (refresh=true): aynı cüzdanlar güncellenir, satır çoğalmaz.
        _metropol.NextBalanceResponse = new BalanceQueryResponse
        {
            ResponseCode = 0,
            ResponseMessage = "OK",
            UserBalance =
            [
                new UserBalance { WalletId = 1, WalletName = "RESTO", Balance = 100.00m },
                new UserBalance { WalletId = 3, WalletName = "GIFT", Balance = 200.00m },
            ],
        };
        var second = await service.GetBalanceAsync(_cardA, null, forceRefresh: true);
        Assert.True(second.IsSuccess);

        using var verifyAfter = CreateContext(TenantA, _userA1);
        var updated = verifyAfter.CardBalances.AsNoTracking()
            .Where(cb => cb.CardId == _cardA).ToList();
        Assert.Equal(2, updated.Count); // UNIQUE(card_id, wallet_id): upsert, insert değil
        Assert.Equal(100.00m, updated.Single(r => r.WalletId == 1).Balance);
        Assert.Equal(200.00m, updated.Single(r => r.WalletId == 3).Balance);
    }

    // (b) Metropol ERİŞİLEMEZSE (exception) son bilinen snapshot stale=true + doğru asOf döner.
    [Fact]
    public async Task Balance_returns_stale_snapshot_when_metropol_unreachable()
    {
        var service = CreateBalanceService(TenantA, _userA1);

        // Önce başarılı senkron: snapshot oluşur.
        var warm = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);
        Assert.True(warm.IsSuccess);

        // Sonra Metropol düşer: refresh=true cache'i de atlar → snapshot yedeği devreye girer.
        _metropol.NextBalanceException = new HttpRequestException("bağlantı kurulamadı");
        var result = await service.GetBalanceAsync(_cardA, null, forceRefresh: true);

        Assert.True(result.IsSuccess); // PROVIDER_UNAVAILABLE yutulur, 200 + stale
        Assert.True(result.Value.Stale);
        Assert.Equal(2, result.Value.Wallets.Count);
        Assert.Equal("30824.00", result.Value.Wallets[0].Balance);
        Assert.Equal("75405.00", result.Value.TotalBalance);

        // asOf = snapshot satırlarının son UpdatedAt'i (son başarılı senkron zamanı).
        using var verify = CreateContext(TenantA, _userA1);
        var expectedAsOf = verify.CardBalances.AsNoTracking()
            .Where(cb => cb.CardId == _cardA).ToList().Max(cb => cb.UpdatedAt);
        Assert.Equal(expectedAsOf, result.Value.AsOf);
    }

    // (b2) İş kuralı hatası (ResponseCode != 0) snapshot'a DÜŞMEZ — 422 aynen kalır.
    [Fact]
    public async Task Balance_business_error_still_fails_even_with_snapshot()
    {
        var service = CreateBalanceService(TenantA, _userA1);
        var warm = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);
        Assert.True(warm.IsSuccess);

        _metropol.NextBalanceResponse.ResponseCode = 7085;
        var result = await service.GetBalanceAsync(_cardA, null, forceRefresh: true);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, result.Error!.Code);
        Assert.Equal(422, result.Error.HttpStatus);
    }

    // (c) Snapshot YOKKEN erişilemezlik eski davranışla hata döner (yutulmaz).
    [Fact]
    public async Task Balance_without_snapshot_keeps_old_failure_behavior_when_unreachable()
    {
        _metropol.NextBalanceException = new HttpRequestException("bağlantı kurulamadı");
        var service = CreateBalanceService(TenantA, _userA1);

        await Assert.ThrowsAsync<HttpRequestException>(
            () => service.GetBalanceAsync(_cardA, null, forceRefresh: false));

        using var verify = CreateContext(TenantA, _userA1);
        Assert.Empty(verify.CardBalances.AsNoTracking().Where(cb => cb.CardId == _cardA).ToList());
    }

    // (c2) Token ÇÖZÜLEMİYORSA (bozuk kayıt/anahtar rotasyonu) snapshot varsa stale döner —
    // erişilemezlikle aynı muamele; 500 yerine son bilinen bakiye.
    [Fact]
    public async Task Balance_returns_stale_snapshot_when_token_undecryptable()
    {
        var service = CreateBalanceService(TenantA, _userA1);
        var warm = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);
        Assert.True(warm.IsSuccess);

        // Kart token'ı bozulur: cipher önekini taşımayan değer Decrypt'te null döner.
        using (var corrupt = CreateContext(TenantA, _userA1))
        {
            var card = corrupt.Cards.First(c => c.Id == _cardA);
            card.UserAccountTokenEncrypted = "BOZUK-KAYIT";
            corrupt.SaveChanges();
        }

        var result = await service.GetBalanceAsync(_cardA, null, forceRefresh: true);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.Stale);
        Assert.Equal("75405.00", result.Value.TotalBalance);
    }

    // (c3) Token çözülemez + snapshot YOK → 500 hata davranışı korunur (sessiz boş veri yok).
    [Fact]
    public async Task Balance_fails_when_token_undecryptable_and_no_snapshot()
    {
        using (var corrupt = CreateContext(TenantA, _userA1))
        {
            var card = corrupt.Cards.First(c => c.Id == _cardA);
            card.UserAccountTokenEncrypted = "BOZUK-KAYIT";
            corrupt.SaveChanges();
        }

        var service = CreateBalanceService(TenantA, _userA1);
        var result = await service.GetBalanceAsync(_cardA, null, forceRefresh: false);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.InternalError, result.Error!.Code);
        Assert.Equal(500, result.Error.HttpStatus);
    }

    // (d) İZOLASYON: başka tenant'ın kartının snapshot'ına erişilemez.
    [Fact]
    public async Task Other_tenants_snapshot_is_not_accessible()
    {
        // Tenant B kullanıcısı kendi kartı için snapshot oluşturur.
        var serviceB = CreateBalanceService(TenantB, _userB1);
        var warmB = await serviceB.GetBalanceAsync(_cardB, null, forceRefresh: false);
        Assert.True(warmB.IsSuccess);

        // Query filter (Card üzerinden tenant): A bağlamında B kartının satırları görünmez.
        using (var contextA = CreateContext(TenantA, _userA1))
        {
            Assert.Empty(contextA.CardBalances.AsNoTracking()
                .Where(cb => cb.CardId == _cardB).ToList());
        }

        // Servis yolu: Metropol erişilemez olsa bile başka tenant'ın kartı NOT_FOUND kalır —
        // sahiplik doğrulaması Metropol/snapshot'tan ÖNCE yapılır, stale veri sızmaz.
        _metropol.NextBalanceException = new HttpRequestException("bağlantı kurulamadı");
        var serviceA = CreateBalanceService(TenantA, _userA1);
        var result = await serviceA.GetBalanceAsync(_cardB, null, forceRefresh: true);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
    }

    // ── (f) GET /transactions: maskeleme + işaretli tutar + tip eşleme ────────

    [Fact]
    public async Task Transactions_mask_name_and_sign_sale_amount()
    {
        _metropol.NextTransactionResponse.PaymentInfo =
        [
            NewItem(20040736, tranTypeId: 1, amount: 300.00m, info: "Ali Tekin",
                date: "2026-04-22T15:28:00", branch: "Elif Telefon Testi"),
            NewItem(20040737, tranTypeId: 2, amount: 500.00m, info: "Veli Kaya",
                date: "2026-04-23T10:00:00"),
        ];
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetTransactionsAsync(_cardA, 1, 20, null, null);

        Assert.True(result.IsSuccess);
        var sale = result.Value.Items.Single(i => i.TransactionId == 20040736);

        // İsim YALNIZCA maskeli döner (Masking.MaskName: "Ali Tekin" → "Al*** Te**").
        Assert.Equal("Al*** Te**", sale.MaskedName);
        Assert.DoesNotContain("Ali Tekin", sale.MaskedName);

        Assert.Equal("sale", sale.Type);
        Assert.Equal("-300.00", sale.Amount); // satış = harcama → eksi işaretli string
        Assert.Equal("RESTOPAY", sale.WalletName);
        Assert.Equal("Elif Telefon Testi", sale.Title);
        Assert.Equal("20040736", sale.ApprovalNo);
        Assert.Equal("2026-04-22T15:28:00Z", sale.Date);

        var transfer = result.Value.Items.Single(i => i.TransactionId == 20040737);
        Assert.Equal("transfer", transfer.Type); // TranTypeId != 1 → transfer (varsayım)
        Assert.Equal("500.00", transfer.Amount); // transferde sağlayıcı işareti korunur
        Assert.Equal("Ve*** Ka**", transfer.MaskedName);

        // Upstream'e çözülmüş token gider (UserAccountRef).
        Assert.Equal(CardAToken, _metropol.TransactionCalls.Single().UserAccountRef);
    }

    [Fact]
    public async Task Transactions_paginate_in_memory_newest_first()
    {
        // Metropol TransactionHistory sayfasız döner → bellekte sayfalama.
        _metropol.NextTransactionResponse.PaymentInfo = Enumerable.Range(1, 5)
            .Select(i => NewItem(i, tranTypeId: 1, amount: i * 10m, info: "Ali Tekin",
                date: $"2026-04-0{i}T12:00:00"))
            .ToList();
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetTransactionsAsync(_cardA, page: 2, pageSize: 2, null, null);

        Assert.True(result.IsSuccess);
        Assert.Equal(5, result.Value.Total);
        Assert.Equal(2, result.Value.Page);
        Assert.Equal(2, result.Value.PageSize);
        // En yeni önce: tam sıra [5,4,3,2,1]; 2. sayfa → [3,2].
        Assert.Equal([3, 2], result.Value.Items.Select(i => i.TransactionId).ToArray());
    }

    [Fact]
    public async Task Transactions_date_filter_applies_and_unparseable_date_kept_raw()
    {
        _metropol.NextTransactionResponse.PaymentInfo =
        [
            NewItem(1, 1, 10m, "Ali Tekin", date: "2026-04-01T12:00:00"),
            NewItem(2, 1, 20m, "Ali Tekin", date: "2026-04-20T12:00:00"),
            // Biçimi bozuk tarih: kayıt ATLANMAZ, date alanına ham değer düşer (en iyi çaba).
            NewItem(3, 1, 30m, "Ali Tekin", date: "tarih-degil"),
        ];
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetTransactionsAsync(
            _cardA, 1, 20,
            startDate: DateTimeOffset.Parse("2026-04-10T00:00:00Z"), endDate: null);

        Assert.True(result.IsSuccess);
        var ids = result.Value.Items.Select(i => i.TransactionId).ToList();
        Assert.DoesNotContain(1, ids); // aralık dışı (eski) işlem filtrelendi
        Assert.Contains(2, ids);
        Assert.Contains(3, ids); // tarihi çözülemeyen kayıt güvenli tarafta listede kalır
        Assert.Equal("tarih-degil", result.Value.Items.Single(i => i.TransactionId == 3).Date);
    }

    // ── GET /recent: son 5 işlem ──────────────────────────────────────────────

    [Fact]
    public async Task Recent_returns_latest_five()
    {
        _metropol.NextTransactionResponse.PaymentInfo = Enumerable.Range(1, 7)
            .Select(i => NewItem(i, tranTypeId: 1, amount: i * 10m, info: "Ali Tekin",
                date: $"2026-04-0{i}T12:00:00"))
            .ToList();
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetRecentAsync(_cardA);

        Assert.True(result.IsSuccess);
        Assert.Equal(5, result.Value.Items.Count);
        // En yeni 5 işlem: [7,6,5,4,3].
        Assert.Equal([7, 6, 5, 4, 3], result.Value.Items.Select(i => i.TransactionId).ToArray());
    }

    [Fact]
    public async Task Transactions_for_other_tenants_card_returns_not_found()
    {
        var service = CreateBalanceService(TenantA, _userA1);

        var result = await service.GetTransactionsAsync(_cardB, 1, 20, null, null);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
        Assert.Empty(_metropol.TransactionCalls);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private static TransactionHistoryItem NewItem(
        int id, int tranTypeId, decimal amount, string info, string date, string? branch = null) => new()
    {
        TransactionId = id,
        TranTypeId = tranTypeId,
        Amount = amount,
        TransactionInfo = info,
        TransactionDate = date,
        ProductName = "RESTOPAY",
        BranchName = branch,
        MerchantCode = "M001",
        TerminalCode = "T001",
    };

    private BalanceService CreateBalanceService(Guid tenantId, Guid userId)
    {
        var tenantContext = new StubTenantContext(tenantId, userId);
        return new BalanceService(
            CreateContext(tenantId, userId), tenantContext, _cipher, _metropol, _cache,
            NullLogger<BalanceService>.Instance);
    }

    private AppDbContext CreateContext(Guid? tenantId, Guid? userId)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        return new AppDbContext(options, new StubTenantContext(tenantId, userId));
    }

    public void Dispose() => _connection.Dispose();

    private sealed class StubTenantContext(Guid? tenantId, Guid? userId) : ITenantContext
    {
        public Guid? TenantId => tenantId;
        public Guid? UserId => userId;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId => TenantId
            ?? throw new InvalidOperationException("Tenant bağlamı yok.");
    }
}
