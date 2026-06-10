using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Payments;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Payments;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Security;
using MetropolBusiness.UnitTests.Cards;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.UnitTests.Payments;

/// <summary>
/// Transfer senaryoları (TODO 1.7 backend, API_CONTRACT §8): transfer idempotent'tir
/// (aynı anahtar Metropol'e İKİNCİ KEZ gitmez), tutar TAM TL olmalıdır (Metropol Amount
/// int — LESSONS.md varsayımı), telefonla alıcı YALNIZCA aynı tenant'ta çözülür
/// (izolasyon), saveRecipient alıcıyı ŞİFRELİ token'la kaydeder, kart no ile transfer
/// kapalıdır (sözleşme boşluğu). SQLite in-memory AppDbContext (CardsServiceTests deseni).
/// </summary>
public sealed class TransfersServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private const string SenderCardToken = "PLAIN-TOKEN-SENDER-A1";
    private const string ReceiverCardToken = "PLAIN-TOKEN-RECEIVER-A2";
    private const string SavedRecipientToken = "PLAIN-TOKEN-SAVED-X";

    /// <summary>Tenant A'daki alıcının telefonu — tenant B'de AYNI numara aranamaz.</summary>
    private const string ReceiverPhone = "5551112233";

    /// <summary>Tenant B'de kayıtlı telefon — tenant A'dan transferde BULUNMAMALI.</summary>
    private const string OtherTenantPhone = "5559998877";

    private readonly SqliteConnection _connection;
    private readonly PlaceholderFieldCipher _cipher = new();
    private readonly FakeMetropolApiClient _metropol = new();

    private readonly MemoryDistributedCache _cache = new(
        Options.Create(new MemoryDistributedCacheOptions()));

    private readonly Guid _userA1 = Guid.NewGuid(); // tenant A, gönderen (kartlı)
    private readonly Guid _userA2 = Guid.NewGuid(); // tenant A, telefonla alıcı (kartlı)
    private readonly Guid _userB1 = Guid.NewGuid(); // tenant B, kartlı

    private readonly Guid _senderCardA1 = Guid.NewGuid();
    private readonly Guid _receiverCardA2 = Guid.NewGuid();
    private readonly Guid _savedRecipientA1 = Guid.NewGuid();

    public TransfersServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "Firma A", Code = "AAA", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "Firma B", Code = "BBB", Status = TenantStatus.Active });

        seed.Users.AddRange(
            new User
            {
                Id = _userA1, TenantId = TenantA, Phone = "5550000001",
                FirstName = "Gediz", LastName = "Uçar",
            },
            new User
            {
                Id = _userA2, TenantId = TenantA, Phone = ReceiverPhone,
                FirstName = "Ali", LastName = "Tekin",
            },
            new User { Id = _userB1, TenantId = TenantB, Phone = OtherTenantPhone });

        seed.Cards.AddRange(
            new Card
            {
                Id = _senderCardA1,
                TenantId = TenantA,
                UserId = _userA1,
                UserAccountTokenEncrypted = _cipher.Encrypt(SenderCardToken),
                MaskedCardNo = "637******976",
                HolderName = "Gediz Uçar",
            },
            new Card
            {
                Id = _receiverCardA2,
                TenantId = TenantA,
                UserId = _userA2,
                UserAccountTokenEncrypted = _cipher.Encrypt(ReceiverCardToken),
                MaskedCardNo = "637******555",
            },
            new Card
            {
                Id = Guid.NewGuid(),
                TenantId = TenantB,
                UserId = _userB1,
                UserAccountTokenEncrypted = _cipher.Encrypt("PLAIN-TOKEN-CARD-B1"),
                MaskedCardNo = "555******111",
            });

        seed.SavedRecipients.Add(new SavedRecipient
        {
            Id = _savedRecipientA1,
            TenantId = TenantA,
            UserId = _userA1,
            Label = "Annem",
            MaskedCardNo = "637*****222",
            RecipientTokenEncrypted = _cipher.Encrypt(SavedRecipientToken),
        });

        seed.SaveChanges();
    }

    // ── (d) transfer idempotent: aynı anahtar Metropol'e ikinci kez GİTMEZ ───

    [Fact]
    public async Task Transfer_same_key_replays_first_receipt_without_second_metropol_call()
    {
        var service = CreateService(TenantA, _userA1);

        var first = await service.TransferAsync(NewTransferRequest(), "t-key-ayni");
        Assert.True(first.IsSuccess);
        Assert.True(first.Value.Success);
        Assert.Equal("500.00", first.Value.Amount);
        Assert.Single(_metropol.BalanceTransferCalls);

        var second = await CreateService(TenantA, _userA1)
            .TransferAsync(NewTransferRequest(), "t-key-ayni");

        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value, second.Value); // record: ilk fiş AYNEN döner
        Assert.Single(_metropol.BalanceTransferCalls); // ikinci kez para hareketi YOK
    }

    // ── pending'de ikinci transfer 409 DUPLICATE_OPERATION ───────────────────

    [Fact]
    public async Task Transfer_while_pending_returns_409_duplicate()
    {
        using (var seed = CreateContext(TenantA, _userA1))
        {
            seed.PaymentIdempotencies.Add(new PaymentIdempotency
            {
                TenantId = TenantA,
                UserId = _userA1,
                IdempotencyKey = "t-key-pending",
                Operation = "balance_transfer",
                Status = "pending",
            });
            seed.SaveChanges();
        }

        var result = await CreateService(TenantA, _userA1)
            .TransferAsync(NewTransferRequest(), "t-key-pending");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.DuplicateOperation, result.Error!.Code);
        Assert.Equal(409, result.Error.HttpStatus);
        Assert.Empty(_metropol.BalanceTransferCalls);
    }

    // ── (f) tam TL olmayan tutar reddedilir (Metropol Amount int — LESSONS.md) ─

    [Theory]
    [InlineData("500.50")]
    [InlineData("0.99")]
    public async Task Transfer_non_whole_lira_amount_returns_validation_error(string amount)
    {
        var result = await CreateService(TenantA, _userA1)
            .TransferAsync(NewTransferRequest(amount: amount), "t-key-kurus");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
        Assert.Equal("Transfer tutarı tam TL olmalıdır.", result.Error.Message);
        Assert.Empty(_metropol.BalanceTransferCalls); // kuruş sessizce yuvarlanmaz
    }

    // ── (g) telefonla alıcı YALNIZCA aynı tenant'ta çözülür (izolasyon) ──────

    [Fact]
    public async Task Transfer_phone_receiver_resolves_in_same_tenant_with_masked_fields()
    {
        var result = await CreateService(TenantA, _userA1).TransferAsync(
            NewTransferRequest(receiver: new TransferReceiverDto("phone", ReceiverPhone)),
            "t-key-phone");

        Assert.True(result.IsSuccess);
        // Metropol'e alıcının kart token'ı (çözülmüş) ve INT tutar gider.
        var call = Assert.Single(_metropol.BalanceTransferCalls);
        Assert.Equal(SenderCardToken, call.SenderCardToken);
        Assert.Equal(ReceiverCardToken, call.ReceiverCardToken);
        Assert.Equal(500, call.Amount);
        Assert.Equal(1, call.WalletId);

        // Alıcı alanları istemciye MASKELİ gider (CLAUDE.md kural 4).
        Assert.Equal("Al*** Te**", result.Value.ReceiverMaskedName);
        Assert.Equal("637******555", result.Value.ReceiverMaskedCardNo);
        Assert.Equal("Gediz Uçar", result.Value.SenderName);
    }

    [Fact]
    public async Task Transfer_phone_in_other_tenant_is_not_found()
    {
        // Telefon TENANT B'de kayıtlı: tenant A'dan transferde asla bulunmamalı.
        var result = await CreateService(TenantA, _userA1).TransferAsync(
            NewTransferRequest(receiver: new TransferReceiverDto("phone", OtherTenantPhone)),
            "t-key-izolasyon");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
        Assert.Equal("Alıcı bulunamadı.", result.Error.Message);
        Assert.Empty(_metropol.BalanceTransferCalls);
    }

    // ── (j) saveRecipient=true alıcıyı ŞİFRELİ token'la kaydeder ─────────────

    [Fact]
    public async Task Transfer_save_recipient_creates_record_with_encrypted_token()
    {
        var result = await CreateService(TenantA, _userA1).TransferAsync(
            NewTransferRequest(
                receiver: new TransferReceiverDto("phone", ReceiverPhone),
                saveRecipient: true,
                recipientLabel: "İş Arkadaşım"),
            "t-key-kayit");

        Assert.True(result.IsSuccess);

        using var verify = CreateContext(TenantA, _userA1);
        var saved = await verify.SavedRecipients.AsNoTracking()
            .SingleAsync(r => r.UserId == _userA1 && r.Label == "İş Arkadaşım");

        // DB'de DÜZ TOKEN YOK: "enc:" önekli şifreli değer saklanır (CLAUDE.md kural 4).
        Assert.StartsWith("enc:", saved.RecipientTokenEncrypted);
        Assert.DoesNotContain(ReceiverCardToken, saved.RecipientTokenEncrypted);
        Assert.Equal(ReceiverCardToken, _cipher.Decrypt(saved.RecipientTokenEncrypted));
        Assert.Equal("637******555", saved.MaskedCardNo);
        Assert.Equal(TenantA, saved.TenantId);
    }

    // ── kayıtlı alıcıyla transfer: şifreli token çözülüp Metropol'e gider ────

    [Fact]
    public async Task Transfer_saved_receiver_uses_decrypted_recipient_token()
    {
        var result = await CreateService(TenantA, _userA1).TransferAsync(
            NewTransferRequest(
                receiver: new TransferReceiverDto("saved", _savedRecipientA1.ToString())),
            "t-key-saved");

        Assert.True(result.IsSuccess);
        var call = Assert.Single(_metropol.BalanceTransferCalls);
        Assert.Equal(SavedRecipientToken, call.ReceiverCardToken);
        Assert.Equal("637*****222", result.Value.ReceiverMaskedCardNo);
    }

    [Fact]
    public async Task Transfer_with_other_users_saved_recipient_is_not_found()
    {
        // Kayıt A1'in: aynı tenant'taki A2 ve başka tenant'taki B1 kullanamaz.
        var sameTenantOtherUser = await CreateService(TenantA, _userA2).TransferAsync(
            NewTransferRequest(
                senderCardId: _receiverCardA2,
                receiver: new TransferReceiverDto("saved", _savedRecipientA1.ToString())),
            "t-key-saved-a2");
        Assert.False(sameTenantOtherUser.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, sameTenantOtherUser.Error!.Code);

        Assert.Empty(_metropol.BalanceTransferCalls);
    }

    // ── kart numarasıyla transfer kapalı (sözleşme boşluğu — LESSONS.md) ─────

    [Fact]
    public async Task Transfer_with_card_number_returns_validation_error()
    {
        var result = await CreateService(TenantA, _userA1).TransferAsync(
            NewTransferRequest(receiver: new TransferReceiverDto("card", "6375021912342976")),
            "t-key-card");

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
        Assert.Equal("Kart numarasıyla transfer henüz desteklenmiyor.", result.Error.Message);
        Assert.Empty(_metropol.BalanceTransferCalls);
    }

    // ── Metropol hatası katalog mesajına çevrilir, failed kaydı tekrar döner ─

    [Fact]
    public async Task Transfer_metropol_error_maps_to_catalog_and_is_not_retried()
    {
        _metropol.NextBalanceTransferResponse.ResponseCode = 7085;
        var service = CreateService(TenantA, _userA1);

        var first = await service.TransferAsync(NewTransferRequest(), "t-key-hata");
        Assert.False(first.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, first.Error!.Code);
        Assert.Equal("Alışveriş başarısız.", first.Error.Message);

        _metropol.NextBalanceTransferResponse.ResponseCode = 0;
        var second = await CreateService(TenantA, _userA1)
            .TransferAsync(NewTransferRequest(), "t-key-hata");

        Assert.False(second.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, second.Error!.Code);
        Assert.Single(_metropol.BalanceTransferCalls); // başarısız işlem TEKRAR gönderilmez
    }

    // ── resolve-qr: opak payload token olarak döner; JSON'dan maskeli alanlar ─

    [Fact]
    public async Task ResolveQr_opaque_payload_returns_token_with_placeholders()
    {
        var result = await CreateService(TenantA, _userA1).ResolveQrAsync("OPAK-ALICI-TOKEN-42");

        Assert.True(result.IsSuccess);
        Assert.Equal("OPAK-ALICI-TOKEN-42", result.Value.ReceiverToken);
        Assert.Equal("***", result.Value.ReceiverMaskedName);
        Assert.Equal("***", result.Value.ReceiverMaskedCardNo);
    }

    [Fact]
    public async Task ResolveQr_json_payload_extracts_and_masks_fields()
    {
        const string payload =
            """{"token":"JSON-ALICI-TOKEN","name":"Ali Tekin","cardNo":"6375021912342976"}""";

        var result = await CreateService(TenantA, _userA1).ResolveQrAsync(payload);

        Assert.True(result.IsSuccess);
        Assert.Equal("JSON-ALICI-TOKEN", result.Value.ReceiverToken);
        // Maskeleme backend'de: payload maskesiz gelse bile maskeli döner.
        Assert.Equal("Al*** Te**", result.Value.ReceiverMaskedName);
        Assert.Equal("637******976", result.Value.ReceiverMaskedCardNo);
    }

    // ── saved-recipients CRUD: kendi kayıtları, tenant + kullanıcı filtreli ──

    [Fact]
    public async Task SavedRecipients_list_add_delete_are_scoped_to_owner()
    {
        // A1 yalnızca kendi kaydını görür; B1 (başka tenant) hiçbirini görmez.
        var ownList = await CreateService(TenantA, _userA1).ListRecipientsAsync();
        var item = Assert.Single(ownList.Value.Items);
        Assert.Equal("Annem", item.Label);

        Assert.Empty((await CreateService(TenantB, _userB1).ListRecipientsAsync()).Value.Items);
        Assert.Empty((await CreateService(TenantA, _userA2).ListRecipientsAsync()).Value.Items);

        // Ekleme: token şifreli, maskesiz kart no MASKELENEREK saklanır.
        var added = await CreateService(TenantA, _userA2).AddRecipientAsync(
            new SaveRecipientRequest("Komşum", "YENI-OPAK-TOKEN", "6375021912340555"));
        Assert.True(added.IsSuccess);
        Assert.Equal("637******555", added.Value.MaskedCardNo);

        using (var verify = CreateContext(TenantA, _userA2))
        {
            var stored = await verify.SavedRecipients.AsNoTracking()
                .SingleAsync(r => r.Id == added.Value.Id);
            Assert.StartsWith("enc:", stored.RecipientTokenEncrypted);
            Assert.Equal("YENI-OPAK-TOKEN", _cipher.Decrypt(stored.RecipientTokenEncrypted));
        }

        // Silme: başkasının kaydı 404; kendi kaydı silinir.
        var otherDelete = await CreateService(TenantA, _userA2).DeleteRecipientAsync(_savedRecipientA1);
        Assert.False(otherDelete.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, otherDelete.Error!.Code);

        var ownDelete = await CreateService(TenantA, _userA1).DeleteRecipientAsync(_savedRecipientA1);
        Assert.True(ownDelete.IsSuccess);
        Assert.Empty((await CreateService(TenantA, _userA1).ListRecipientsAsync()).Value.Items);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private TransferRequest NewTransferRequest(
        Guid? senderCardId = null,
        TransferReceiverDto? receiver = null,
        string amount = "500.00",
        bool saveRecipient = false,
        string? recipientLabel = null) => new(
        SenderCardId: senderCardId ?? _senderCardA1,
        Receiver: receiver ?? new TransferReceiverDto("qr", "OPAK-ALICI-TOKEN-42"),
        WalletId: 1,
        Amount: amount,
        Note: null,
        SaveRecipient: saveRecipient,
        RecipientLabel: recipientLabel);

    private TransfersService CreateService(Guid tenantId, Guid userId)
    {
        var tenantContext = new StubTenantContext(tenantId, userId);
        return new TransfersService(
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
