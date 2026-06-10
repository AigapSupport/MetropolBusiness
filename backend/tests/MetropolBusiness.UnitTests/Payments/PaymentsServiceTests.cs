using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Payments;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Payments;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Security;
using MetropolBusiness.Integration.Metropol.Services;
using MetropolBusiness.UnitTests.Cards;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.UnitTests.Payments;

/// <summary>
/// Harcama senaryoları (TODO 1.6 backend, API_CONTRACT §7): SaleConfirm idempotency'si
/// EN KRİTİK — aynı Idempotency-Key ile ikinci istek Metropol'e GİTMEZ ve ilk yanıt
/// AYNEN döner; pending'de 409; farklı anahtar normal işlenir. WalletId kuralı
/// (ProductId 3→3, diğerleri→1), kart sahipliği (tenant izolasyonu) ve Metropol hata
/// kataloğu da burada doğrulanır. SQLite in-memory AppDbContext (CardsServiceTests deseni).
/// </summary>
public sealed class PaymentsServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string CardA1Token = "PLAIN-TOKEN-CARD-A1";

    private readonly SqliteConnection _connection;
    private readonly PlaceholderFieldCipher _cipher = new();
    private readonly FakeMetropolApiClient _metropol = new();

    /// <summary>Cache servis örnekleri arasında paylaşılır (gerçek dağıtık cache gibi).</summary>
    private readonly MemoryDistributedCache _cache = new(
        Options.Create(new MemoryDistributedCacheOptions()));

    private readonly Guid _userA1 = Guid.NewGuid(); // tenant A, MemberId'li, kartlı
    private readonly Guid _userA2 = Guid.NewGuid(); // tenant A, kartsız
    private readonly Guid _userB1 = Guid.NewGuid(); // tenant B, kartlı

    private readonly Guid _cardA1 = Guid.NewGuid();
    private readonly Guid _cardB1 = Guid.NewGuid();

    public PaymentsServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "Firma A", Code = "AAA", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "Firma B", Code = "BBB", Status = TenantStatus.Active });

        seed.Users.AddRange(
            new User { Id = _userA1, TenantId = TenantA, Phone = "5550000001", MemberId = "3299" },
            new User { Id = _userA2, TenantId = TenantA, Phone = "5550000002", MemberId = "3300" },
            new User { Id = _userB1, TenantId = TenantB, Phone = "5550000003", MemberId = "4400" });

        seed.Cards.AddRange(
            new Card
            {
                Id = _cardA1,
                TenantId = TenantA,
                UserId = _userA1,
                UserAccountTokenEncrypted = _cipher.Encrypt(CardA1Token),
                MaskedCardNo = "637******976",
                HolderName = "AIGAP Test",
            },
            new Card
            {
                Id = _cardB1,
                TenantId = TenantB,
                UserId = _userB1,
                UserAccountTokenEncrypted = _cipher.Encrypt("PLAIN-TOKEN-CARD-B1"),
                MaskedCardNo = "555******111",
            });

        seed.SaveChanges();
    }

    // ── POST /sale/presale-info: MemberId DB'den, UserAccountRef karttan ─────

    [Fact]
    public async Task Presale_sends_member_id_from_db_and_decrypted_card_token()
    {
        var service = CreateService(TenantA, _userA1);

        var result = await service.PresaleAsync(NewPresaleRequest());

        Assert.True(result.IsSuccess);
        var call = Assert.Single(_metropol.PreSaleCalls);
        Assert.Equal("3299", call.MemberId);
        Assert.Equal(CardA1Token, call.UserAccountRef);
        Assert.Equal("406123", call.Code);
        Assert.Equal(2, call.CodeType);

        // Para alanı bizim sözleşmede string'tir ("200.00").
        Assert.Equal("200.00", result.Value.RequestAmount);
        Assert.Equal("Elif Telefon Testi", result.Value.MerchantName);
        Assert.Equal(98598610, result.Value.TransactionId);
    }

    // ── (e) WalletId kuralı: ProductId 3 → 3 (Gift), 1 → 1, bilinmeyen 2 → 1 ─

    [Theory]
    [InlineData(3, 3)]
    [InlineData(1, 1)]
    [InlineData(2, 1)]
    public async Task Presale_suggested_wallet_follows_product_id_rule(int productId, int expectedWalletId)
    {
        _metropol.NextPreSaleResponse.ProductId = productId;
        var service = CreateService(TenantA, _userA1);

        var result = await service.PresaleAsync(NewPresaleRequest());

        Assert.True(result.IsSuccess);
        Assert.Equal(expectedWalletId, result.Value.SuggestedWalletId);
    }

    // ── (h) başka kullanıcının/tenant'ın kartıyla presale → NOT_FOUND ────────

    [Fact]
    public async Task Presale_with_another_users_card_returns_not_found_without_metropol_call()
    {
        // Aynı tenant'taki başka kullanıcı: kart onun değil → 404.
        var otherUser = await CreateService(TenantA, _userA2).PresaleAsync(NewPresaleRequest());
        Assert.False(otherUser.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, otherUser.Error!.Code);

        // Başka tenant'ın kullanıcısı da göremez (tenant query filter, izolasyon).
        var otherTenant = await CreateService(TenantB, _userB1).PresaleAsync(NewPresaleRequest());
        Assert.False(otherTenant.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, otherTenant.Error!.Code);

        Assert.Empty(_metropol.PreSaleCalls);
    }

    // ── (i) Metropol hata kodu katalog mesajına çevrilir ─────────────────────

    [Fact]
    public async Task Presale_metropol_error_maps_to_catalog_message()
    {
        _metropol.NextPreSaleResponse.ResponseCode = 7601;
        var service = CreateService(TenantA, _userA1);

        var result = await service.PresaleAsync(NewPresaleRequest());

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, result.Error!.Code);
        Assert.Equal(422, result.Error.HttpStatus);
        Assert.Equal("Süresi geçmiş QR kod. Tekrar Deneyiniz.", result.Error.Message);
    }

    // ── (a) AYNI Idempotency-Key: ikinci confirm Metropol'e GİTMEZ ───────────

    [Fact]
    public async Task Confirm_same_key_replays_first_response_without_second_metropol_call()
    {
        var service = CreateService(TenantA, _userA1);

        var first = await service.ConfirmSaleAsync(NewConfirmRequest(), "key-ayni");
        Assert.True(first.IsSuccess);
        Assert.True(first.Value.Success);
        Assert.Equal("637******976", first.Value.MaskedCardNo);
        Assert.Single(_metropol.SaleConfirmCalls);

        // Upstream yanıtı DEĞİŞSE bile kayıtlı anlık görüntü aynen dönmeli.
        _metropol.NextSaleConfirmResponse.MerchantNo = "DEGISTI";
        var second = await CreateService(TenantA, _userA1)
            .ConfirmSaleAsync(NewConfirmRequest(), "key-ayni");

        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value, second.Value); // record: alan alan birebir aynı yanıt
        Assert.Single(_metropol.SaleConfirmCalls); // Metropol'e İKİNCİ KEZ GİDİLMEDİ
    }

    // ── (b) pending kayıtta ikinci istek 409 DUPLICATE_OPERATION ─────────────

    [Fact]
    public async Task Confirm_while_pending_returns_409_duplicate()
    {
        using (var seed = CreateContext(TenantA, _userA1))
        {
            seed.PaymentIdempotencies.Add(new PaymentIdempotency
            {
                TenantId = TenantA,
                UserId = _userA1,
                IdempotencyKey = "key-pending",
                Operation = "sale_confirm",
                Status = "pending",
            });
            seed.SaveChanges();
        }

        var result = await CreateService(TenantA, _userA1)
            .ConfirmSaleAsync(NewConfirmRequest(), "key-pending");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.DuplicateOperation, result.Error!.Code);
        Assert.Equal(409, result.Error.HttpStatus);
        Assert.Empty(_metropol.SaleConfirmCalls); // süren işlem varken Metropol'e gidilmez
    }

    // ── (c) farklı Idempotency-Key ile ikinci harcama normal işlenir ─────────

    [Fact]
    public async Task Confirm_with_different_key_is_processed_normally()
    {
        var service = CreateService(TenantA, _userA1);

        var first = await service.ConfirmSaleAsync(NewConfirmRequest(), "key-1");
        var second = await service.ConfirmSaleAsync(NewConfirmRequest(saleRefCode: "2020-REF-2"), "key-2");

        Assert.True(first.IsSuccess);
        Assert.True(second.IsSuccess);
        Assert.Equal(2, _metropol.SaleConfirmCalls.Count); // iki ayrı harcama → iki çağrı
    }

    // ── Metropol hatası: failed anlık görüntü; aynı anahtar AYNI hatayı döner ─

    [Fact]
    public async Task Confirm_metropol_error_is_recorded_and_replayed_without_retry()
    {
        _metropol.NextSaleConfirmResponse.ResponseCode = 7085;
        var service = CreateService(TenantA, _userA1);

        var first = await service.ConfirmSaleAsync(NewConfirmRequest(), "key-hata");
        Assert.False(first.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, first.Error!.Code);
        Assert.Equal("Alışveriş başarısız.", first.Error.Message);

        // Upstream düzelse bile aynı anahtar (= aynı SaleRefCode) TEKRAR GÖNDERİLMEZ
        // (CLAUDE.md §6: aynı SaleRefCode/ConsumerRefCode ile tekrar gönderme).
        _metropol.NextSaleConfirmResponse.ResponseCode = 0;
        var second = await CreateService(TenantA, _userA1)
            .ConfirmSaleAsync(NewConfirmRequest(), "key-hata");

        Assert.False(second.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, second.Error!.Code);
        Assert.Equal(first.Error.Message, second.Error.Message);
        Assert.Single(_metropol.SaleConfirmCalls);
    }

    // ── Confirm: tek ödeme kalemi cüzdandan, doğru alanlarla gider ───────────

    [Fact]
    public async Task Confirm_sends_single_wallet_payment_with_card_token()
    {
        var service = CreateService(TenantA, _userA1);

        var result = await service.ConfirmSaleAsync(NewConfirmRequest(), "key-alanlar");

        Assert.True(result.IsSuccess);
        var call = Assert.Single(_metropol.SaleConfirmCalls);
        Assert.Equal(98598610, call.TransactionId);
        Assert.Equal("2020-REF", call.SaleRefCode);
        Assert.Equal(200.00m, call.TransactionAmount);
        Assert.False(string.IsNullOrWhiteSpace(call.ConsumerRefCode)); // boşsa backend üretir

        var payment = Assert.Single(call.PaymentInfo);
        Assert.Equal(MetropolDefaults.WalletPaymentTypeId, payment.PaymentTypeId);
        Assert.Equal(CardA1Token, payment.UserAccountRef);
        Assert.Equal(200.00m, payment.PaymentAmount);
        Assert.Equal(1, payment.WalletId);
        Assert.Equal(string.Empty, payment.BankRefCode);
    }

    // ── Confirm başarıda bakiye cache'i geçersiz kılınır (balanceAfter yerine) ─

    [Fact]
    public async Task Confirm_invalidates_balance_cache_of_card()
    {
        var cacheKey = $"balance:{_cardA1}";
        await _cache.SetStringAsync(cacheKey, "{\"wallets\":[],\"totalBalance\":\"0.00\"}");

        var result = await CreateService(TenantA, _userA1)
            .ConfirmSaleAsync(NewConfirmRequest(), "key-cache");

        Assert.True(result.IsSuccess);
        Assert.Null(await _cache.GetStringAsync(cacheKey)); // taze bakiye §6 ucundan alınır
    }

    // ── Idempotency-Key zorunlu (servis savunması) ───────────────────────────

    [Fact]
    public async Task Confirm_without_idempotency_key_returns_validation_error()
    {
        var result = await CreateService(TenantA, _userA1)
            .ConfirmSaleAsync(NewConfirmRequest(), idempotencyKey: " ");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
        Assert.Empty(_metropol.SaleConfirmCalls);
    }

    // ── GET /sale/info: kart no maskeli döner ────────────────────────────────

    [Fact]
    public async Task GetSaleInfo_masks_unmasked_card_no()
    {
        var service = CreateService(TenantA, _userA1);

        var result = await service.GetSaleInfoAsync("0000052485", "0000063710", "2020-REF");

        Assert.True(result.IsSuccess);
        Assert.Equal("637******976", result.Value.MaskedCardNo); // 6375021912342976 maskelendi
        Assert.Equal("200.00", result.Value.TransactionAmount);
        Assert.Equal("30624.00", result.Value.CardBalance);
        Assert.Equal(1, result.Value.TransactionStatus);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private PresaleInfoRequest NewPresaleRequest() => new("406123", 2, _cardA1);

    private SaleConfirmRequest NewConfirmRequest(string saleRefCode = "2020-REF") => new(
        TransactionId: 98598610,
        SaleRefCode: saleRefCode,
        CardId: _cardA1,
        WalletId: 1,
        Amount: "200.00",
        ConsumerRefCode: null);

    private PaymentsService CreateService(Guid tenantId, Guid userId)
    {
        var tenantContext = new StubTenantContext(tenantId, userId);
        return new PaymentsService(
            CreateContext(tenantId, userId), tenantContext, _cipher, _metropol, _cache);
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
