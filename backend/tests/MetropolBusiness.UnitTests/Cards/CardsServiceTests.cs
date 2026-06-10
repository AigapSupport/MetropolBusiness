using MetropolBusiness.Application.Cards;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Cards;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Security;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.UnitTests.Cards;

/// <summary>
/// Kart yönetimi senaryoları (TODO 1.4 backend, API_CONTRACT §5): confirm token'ı
/// ŞİFRELİ saklar (DB'de düz token yok), kart listesi kullanıcıya/tenant'a kapalıdır,
/// Metropol hatası katalog mesajıyla METROPOL_ERROR'a eşlenir, delete soft-delete'tir
/// ve Metropol'e çözülmüş token gider. SQLite in-memory AppDbContext (MeServiceTests deseni).
/// </summary>
public sealed class CardsServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string SeededCardToken = "SEEDED-PLAIN-TOKEN-A2";

    private readonly SqliteConnection _connection;
    private readonly PlaceholderFieldCipher _cipher = new();
    private readonly FakeMetropolApiClient _metropol = new();

    private readonly Guid _userA1 = Guid.NewGuid(); // tenant A, MemberId'li, kartsız
    private readonly Guid _userA2 = Guid.NewGuid(); // tenant A, kartlı
    private readonly Guid _userA3 = Guid.NewGuid(); // tenant A, MemberId'siz
    private readonly Guid _userB1 = Guid.NewGuid(); // tenant B, kartlı

    private readonly Guid _cardA2 = Guid.NewGuid();
    private readonly Guid _cardB1 = Guid.NewGuid();

    public CardsServiceTests()
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
            new User { Id = _userA3, TenantId = TenantA, Phone = "5550000003", MemberId = null },
            new User { Id = _userB1, TenantId = TenantB, Phone = "5550000004", MemberId = "4400" });

        seed.Cards.AddRange(
            new Card
            {
                Id = _cardA2,
                TenantId = TenantA,
                UserId = _userA2,
                UserAccountTokenEncrypted = _cipher.Encrypt(SeededCardToken),
                MaskedCardNo = "637******976",
                HolderName = "AIGAP Test",
            },
            new Card
            {
                Id = _cardB1,
                TenantId = TenantB,
                UserId = _userB1,
                UserAccountTokenEncrypted = _cipher.Encrypt("SEEDED-PLAIN-TOKEN-B1"),
                MaskedCardNo = "555******111",
                HolderName = "Başka Tenant",
            });

        seed.SaveChanges();
    }

    // ── POST /cards/add: DB'ye kayıt yazmaz, validationGuid döner ────────────

    [Fact]
    public async Task Add_returns_validation_guid_without_writing_db()
    {
        _metropol.NextAddAccountResponse.ValidationGuid = "guid-abc";
        var service = CreateCardsService(TenantA, _userA1);

        var result = await service.AddAsync(new AddCardRequest("6375021912342976", "5345030539"));

        Assert.True(result.IsSuccess);
        Assert.Equal("guid-abc", result.Value.ValidationGuid);
        Assert.Equal("6375021912342976", _metropol.AddAccountCalls.Single().CardNo);

        // Bu adımda kart kaydı OLUŞMAZ (kart ancak OTP doğrulanınca yazılır).
        using var verify = CreateContext(TenantA, _userA1);
        Assert.Equal(0, await verify.Cards.CountAsync(c => c.UserId == _userA1));
    }

    // ── (c) Metropol ResponseCode != 0 → METROPOL_ERROR + katalog mesajı ─────

    [Fact]
    public async Task Add_metropol_error_maps_to_catalog_message()
    {
        _metropol.NextAddAccountResponse.ResponseCode = 7085;
        var service = CreateCardsService(TenantA, _userA1);

        var result = await service.AddAsync(new AddCardRequest("6375021912342976", "5345030539"));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, result.Error!.Code);
        Assert.Equal(422, result.Error.HttpStatus);
        Assert.Equal(MetropolErrorCatalog.GetMessage(7085), result.Error.Message);
    }

    // ── (a) POST /cards/confirm: token ŞİFRELİ saklanır, düz token DB'de YOK ─

    [Fact]
    public async Task Confirm_saves_card_with_encrypted_token_and_no_plain_token_in_db()
    {
        const string plainToken = "FRESH-PLAIN-TOKEN-XYZ";
        _metropol.NextConfirmResponse.UserAccountToken = plainToken;
        var service = CreateCardsService(TenantA, _userA1);

        var result = await service.ConfirmAsync(NewConfirmRequest());

        Assert.True(result.IsSuccess);
        Assert.Equal("637******976", result.Value.MaskedCardNo);
        Assert.Equal("Test", result.Value.Name);
        Assert.Equal("Deneme", result.Value.SurName);

        // DB'de DÜZ TOKEN YOK: "enc:" önekli şifreli değer saklanır (CLAUDE.md kural 4).
        using var verify = CreateContext(TenantA, _userA1);
        var stored = await verify.Cards.AsNoTracking().SingleAsync(c => c.Id == result.Value.CardId);
        Assert.StartsWith("enc:", stored.UserAccountTokenEncrypted);
        Assert.DoesNotContain(plainToken, stored.UserAccountTokenEncrypted);
        Assert.Equal(plainToken, _cipher.Decrypt(stored.UserAccountTokenEncrypted));
        Assert.Equal("Test Deneme", stored.HolderName);
        Assert.Equal(EntityStatus.Active, stored.Status);
        Assert.Equal(TenantA, stored.TenantId);
    }

    [Fact]
    public async Task Confirm_uses_member_id_from_db_not_from_request()
    {
        var service = CreateCardsService(TenantA, _userA1);

        // İstek sahte bir MemberId taşıyor — Metropol'e kullanıcının DB'deki değeri gitmeli.
        var result = await service.ConfirmAsync(NewConfirmRequest(memberId: "9999-SAHTE"));

        Assert.True(result.IsSuccess);
        Assert.Equal("3299", _metropol.ConfirmCalls.Single().MemberId);
    }

    [Fact]
    public async Task Confirm_without_member_id_fails_before_metropol_call()
    {
        var service = CreateCardsService(TenantA, _userA3);

        var result = await service.ConfirmAsync(NewConfirmRequest());

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
        Assert.Empty(_metropol.ConfirmCalls);
    }

    [Fact]
    public async Task Confirm_metropol_error_does_not_create_card()
    {
        _metropol.NextConfirmResponse.ResponseCode = 7601;
        var service = CreateCardsService(TenantA, _userA1);

        var result = await service.ConfirmAsync(NewConfirmRequest());

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, result.Error!.Code);
        Assert.Equal(MetropolErrorCatalog.GetMessage(7601), result.Error.Message);

        using var verify = CreateContext(TenantA, _userA1);
        Assert.Equal(0, await verify.Cards.CountAsync(c => c.UserId == _userA1));
    }

    [Fact]
    public async Task Confirm_masks_card_no_when_provider_returns_unmasked()
    {
        // Savunma: sağlayıcı yanlışlıkla maskesiz no dönerse backend maskeler —
        // DB'ye asla maskesiz kart no yazılmaz (CLAUDE.md kural 4).
        _metropol.NextConfirmResponse.MaskedCardNo = "6375021912342976";
        var service = CreateCardsService(TenantA, _userA1);

        var result = await service.ConfirmAsync(NewConfirmRequest());

        Assert.True(result.IsSuccess);
        Assert.Equal("637******976", result.Value.MaskedCardNo);

        using var verify = CreateContext(TenantA, _userA1);
        var stored = await verify.Cards.AsNoTracking().SingleAsync(c => c.Id == result.Value.CardId);
        Assert.DoesNotContain("6375021912342976", stored.MaskedCardNo);
    }

    // ── (b) GET /cards: başka kullanıcının/tenant'ın kartı listede görünmez ──

    [Fact]
    public async Task List_returns_only_own_cards()
    {
        var ownList = await CreateCardsService(TenantA, _userA2).ListAsync();
        Assert.True(ownList.IsSuccess);
        var card = Assert.Single(ownList.Value.Items);
        Assert.Equal(_cardA2, card.Id);
        Assert.Equal("637******976", card.MaskedCardNo);
        Assert.Equal("active", card.Status);

        // Aynı tenant'taki BAŞKA kullanıcı bu kartı görmez.
        var otherUser = await CreateCardsService(TenantA, _userA1).ListAsync();
        Assert.Empty(otherUser.Value.Items);

        // Başka TENANT'ın kullanıcısı da görmez (query filter, kullanıcı id eşleşse bile).
        var otherTenant = await CreateCardsService(TenantB, _userA2).ListAsync();
        Assert.Empty(otherTenant.Value.Items);
    }

    // ── (e) DELETE /cards/{id}: soft-delete + Metropol'e doğru UserRefNo ─────

    [Fact]
    public async Task Delete_soft_deletes_and_sends_decrypted_token_to_metropol()
    {
        var service = CreateCardsService(TenantA, _userA2);

        var result = await service.DeleteAsync(_cardA2);

        Assert.True(result.IsSuccess);

        // Metropol'e ÇÖZÜLMÜŞ token + token türü ("2") gider (MetropolDefaults varsayımı).
        var call = Assert.Single(_metropol.DeleteUserCalls);
        Assert.Equal(SeededCardToken, call.UserRefNo);
        Assert.Equal(MetropolDefaults.TokenUserRefTypeText, call.UserRefType);

        // Soft-delete: kayıt durur (DeletedAt dolu), filtreli sorguda görünmez.
        using var verify = CreateContext(TenantA, _userA2);
        var stored = await verify.Cards.IgnoreQueryFilters().AsNoTracking()
            .SingleAsync(c => c.Id == _cardA2);
        Assert.NotNull(stored.DeletedAt);
        Assert.Empty((await CreateCardsService(TenantA, _userA2).ListAsync()).Value.Items);
    }

    [Fact]
    public async Task Delete_other_users_card_returns_not_found_without_metropol_call()
    {
        // Sahiplik önce doğrulanır: başka kullanıcının kartı → 404, Metropol'e gidilmez.
        var otherUser = await CreateCardsService(TenantA, _userA1).DeleteAsync(_cardA2);
        Assert.False(otherUser.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, otherUser.Error!.Code);

        // Başka tenant'ın kartı da aynı şekilde 404 (tenant izolasyonu).
        var otherTenant = await CreateCardsService(TenantA, _userA1).DeleteAsync(_cardB1);
        Assert.False(otherTenant.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, otherTenant.Error!.Code);

        Assert.Empty(_metropol.DeleteUserCalls);
    }

    [Fact]
    public async Task Delete_metropol_error_keeps_card()
    {
        _metropol.NextDeleteUserResponse.ResponseCode = 7085;
        var service = CreateCardsService(TenantA, _userA2);

        var result = await service.DeleteAsync(_cardA2);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, result.Error!.Code);

        // Metropol bağı koparamadıysa bizde de silinmez (tutarlılık).
        using var verify = CreateContext(TenantA, _userA2);
        Assert.NotNull(await verify.Cards.AsNoTracking().SingleOrDefaultAsync(c => c.Id == _cardA2));
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private static ConfirmCardRequest NewConfirmRequest(string? memberId = null) => new(
        ValidationGuid: "validation-guid-1",
        ValidationCode: 123456,
        MemberId: memberId,
        Name: "Test",
        Surname: "Deneme",
        Email: "x@mail.com",
        Phone: "5345030539",
        Tckn: null);

    private CardsService CreateCardsService(Guid tenantId, Guid userId)
    {
        var tenantContext = new StubTenantContext(tenantId, userId);
        return new CardsService(CreateContext(tenantId, userId), tenantContext, _cipher, _metropol);
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
