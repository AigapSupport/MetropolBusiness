using MetropolBusiness.Application.Auth;
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
/// (izolasyon), saveRecipient alıcıyı ŞİFRELİ token'la kaydeder, "Başka Karta" alıcısı
/// AddAccount OTP akışıyla doğrulanır (verify/confirm — kart KAYDEDİLMEZ, token opak,
/// SMS kotası kullanıcı başına 5/saat). SQLite in-memory AppDbContext (CardsServiceTests deseni).
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
    private readonly CountingFakeRateLimiter _rateLimiter = new();

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
                FirstName = "Gediz", LastName = "Uçar", MemberId = "MEM-A1",
            },
            new User
            {
                // MemberId BİLİNÇLİ boş: confirm-card MemberId'siz kullanıcı testi için.
                Id = _userA2, TenantId = TenantA, Phone = ReceiverPhone,
                FirstName = "Ali", LastName = "Tekin",
            },
            new User { Id = _userB1, TenantId = TenantB, Phone = OtherTenantPhone, MemberId = "MEM-B1" });

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

    // ── Kartlarım Arası: type=card + kendi kart id'si → kendi token'ı çözülür ─

    [Fact]
    public async Task Transfer_between_own_cards_resolves_own_token_and_masked_fields()
    {
        // A1'e ikinci bir kart ekle (Kartlarım Arası senaryosu).
        var secondCardId = Guid.NewGuid();
        const string secondCardToken = "PLAIN-TOKEN-A1-SECOND";
        using (var seed = CreateContext(TenantA, _userA1))
        {
            seed.Cards.Add(new Card
            {
                Id = secondCardId,
                TenantId = TenantA,
                UserId = _userA1,
                UserAccountTokenEncrypted = _cipher.Encrypt(secondCardToken),
                MaskedCardNo = "637******333",
                HolderName = "Gediz Uçar",
            });
            seed.SaveChanges();
        }

        var result = await CreateService(TenantA, _userA1).TransferAsync(
            NewTransferRequest(receiver: new TransferReceiverDto("card", secondCardId.ToString())),
            "t-key-own-cards");

        Assert.True(result.IsSuccess);
        var call = Assert.Single(_metropol.BalanceTransferCalls);
        Assert.Equal(SenderCardToken, call.SenderCardToken);
        Assert.Equal(secondCardToken, call.ReceiverCardToken); // kendi kartının çözülmüş token'ı
        Assert.Equal("637******333", result.Value.ReceiverMaskedCardNo);
        Assert.Equal("Ge*** Uç**", result.Value.ReceiverMaskedName);
    }

    [Fact]
    public async Task Transfer_card_guid_of_another_users_card_is_not_resolved_as_own()
    {
        // Başka kullanıcının (A2) kart id'si: sahiplik eşleşmez → kendi kartı gibi ÇÖZÜLMEZ,
        // değer opak token muamelesi görür (kart bilgisi sızmaz, maskeli alanlar yer tutucu).
        var result = await CreateService(TenantA, _userA1).TransferAsync(
            NewTransferRequest(receiver: new TransferReceiverDto("card", _receiverCardA2.ToString())),
            "t-key-foreign-guid");

        Assert.True(result.IsSuccess);
        var call = Assert.Single(_metropol.BalanceTransferCalls);
        // A2'nin gerçek token'ı ASLA çözülmez; ham GUID opak değer olarak gider.
        Assert.NotEqual(ReceiverCardToken, call.ReceiverCardToken);
        Assert.Equal(_receiverCardA2.ToString(), call.ReceiverCardToken);
        Assert.Equal("***", result.Value.ReceiverMaskedCardNo);
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

    // ── 'Başka Karta': verify→confirm OTP akışı (AddAccount/AddAccountConfirm) ─

    // (a) Mutlu yol: maskeli alanlar doğru döner, alıcının kartı cards tablosuna YAZILMAZ.
    [Fact]
    public async Task VerifyThenConfirm_recipient_card_returns_masked_fields_without_card_record()
    {
        var service = CreateService(TenantA, _userA1);

        var verify = await service.VerifyRecipientCardAsync(
            new VerifyRecipientCardRequest("6375021912342976", "5551112233"));
        Assert.True(verify.IsSuccess);
        Assert.Equal("validation-guid-1", verify.Value.ValidationGuid);
        var addCall = Assert.Single(_metropol.AddAccountCalls);
        Assert.Equal("6375021912342976", addCall.CardNo);
        Assert.Equal("5551112233", addCall.MobilePhone);

        var confirm = await service.ConfirmRecipientCardAsync(
            new ConfirmRecipientCardRequest("validation-guid-1", 123456));
        Assert.True(confirm.IsSuccess);

        // Maskeleme backend'de (fake yanıtı: Name="Test", SurName="Deneme").
        Assert.Equal("Te*** De**", confirm.Value.ReceiverMaskedName);
        Assert.Equal("637******976", confirm.Value.ReceiverMaskedCardNo);
        Assert.Equal("PLAIN-TOKEN-001", confirm.Value.ReceiverToken); // opak, transferde kullanılır

        // Confirm YALNIZ doğrular: MemberId gönderenin users.member_id'si (sözleşme alanı
        // zorunlu — VARSAYIM, LESSONS.md), Phone/Email/TCKN BOŞ gider (alıcı PII'si yok).
        var confirmCall = Assert.Single(_metropol.ConfirmCalls);
        Assert.Equal("validation-guid-1", confirmCall.ValidationGuid);
        Assert.Equal("MEM-A1", confirmCall.MemberId);
        Assert.Equal(string.Empty, confirmCall.Phone);
        Assert.Equal(string.Empty, confirmCall.Email);
        Assert.Equal(string.Empty, confirmCall.TCKN);

        // CardsService.ConfirmAsync'ten FARK: cards tablosuna KAYIT YOK (seed: 3 kart).
        using var verifyDb = CreateContext(tenantId: null, userId: null);
        Assert.Equal(3, await verifyDb.Cards.IgnoreQueryFilters().CountAsync());
    }

    // (b) confirm'den dönen token ile type=card transfer BAŞARILI ve idempotent.
    [Fact]
    public async Task Transfer_with_confirmed_card_token_succeeds_and_is_idempotent()
    {
        var confirm = await CreateService(TenantA, _userA1).ConfirmRecipientCardAsync(
            new ConfirmRecipientCardRequest("validation-guid-1", 123456));
        Assert.True(confirm.IsSuccess);

        var request = NewTransferRequest(
            receiver: new TransferReceiverDto("card", confirm.Value.ReceiverToken));

        var first = await CreateService(TenantA, _userA1).TransferAsync(request, "t-key-card-token");
        Assert.True(first.IsSuccess);
        var call = Assert.Single(_metropol.BalanceTransferCalls);
        Assert.Equal("PLAIN-TOKEN-001", call.ReceiverCardToken); // opak token aynen gider
        Assert.Equal(SenderCardToken, call.SenderCardToken);

        var second = await CreateService(TenantA, _userA1).TransferAsync(request, "t-key-card-token");
        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value, second.Value); // ilk fiş AYNEN döner
        Assert.Single(_metropol.BalanceTransferCalls); // ikinci kez para hareketi YOK
    }

    // (c) Yanlış OTP: Metropol hatası katalog mesajıyla 422 METROPOL_ERROR.
    [Fact]
    public async Task ConfirmRecipientCard_wrong_otp_maps_metropol_error_to_catalog_422()
    {
        _metropol.NextConfirmResponse.ResponseCode = 4042;

        var result = await CreateService(TenantA, _userA1).ConfirmRecipientCardAsync(
            new ConfirmRecipientCardRequest("validation-guid-1", 999999));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.MetropolError, result.Error!.Code);
        Assert.Equal(422, result.Error.HttpStatus);
        Assert.Equal("İşlem gerçekleştirilemedi. (4042)", result.Error.Message); // katalog genel mesajı
    }

    // (d) verify rate-limit: 6. çağrı 429 RATE_LIMITED, Metropol'e (SMS'e) GİTMEZ.
    [Fact]
    public async Task VerifyRecipientCard_sixth_call_in_window_returns_429_rate_limited()
    {
        var service = CreateService(TenantA, _userA1);
        var request = new VerifyRecipientCardRequest("6375021912342976", "5551112233");

        for (var i = 0; i < 5; i++)
        {
            Assert.True((await service.VerifyRecipientCardAsync(request)).IsSuccess);
        }

        var sixth = await service.VerifyRecipientCardAsync(request);

        Assert.False(sixth.IsSuccess);
        Assert.Equal(ErrorCodes.RateLimited, sixth.Error!.Code);
        Assert.Equal(429, sixth.Error.HttpStatus);
        Assert.Equal(5, _metropol.AddAccountCalls.Count); // 6. istekte SMS tetiklenmez
    }

    // (e) Tenant/kullanıcı bağlamı korunur: kota kullanıcı bazlı, confirm KENDİ MemberId'siyle.
    [Fact]
    public async Task VerifyRecipientCard_rate_limit_is_per_user_and_confirm_uses_own_member_id()
    {
        // A1 kotasını doldurur; başka tenant'taki B1 bundan ETKİLENMEZ ("rcpverify:{userId}").
        var serviceA = CreateService(TenantA, _userA1);
        var request = new VerifyRecipientCardRequest("6375021912342976", "5551112233");
        for (var i = 0; i < 5; i++)
        {
            Assert.True((await serviceA.VerifyRecipientCardAsync(request)).IsSuccess);
        }
        Assert.False((await serviceA.VerifyRecipientCardAsync(request)).IsSuccess);

        var serviceB = CreateService(TenantB, _userB1);
        Assert.True((await serviceB.VerifyRecipientCardAsync(request)).IsSuccess);

        // Confirm her zaman OTURUM SAHİBİNİN users.member_id'siyle gider (istemciden alınmaz).
        var confirm = await serviceB.ConfirmRecipientCardAsync(
            new ConfirmRecipientCardRequest("validation-guid-1", 123456));
        Assert.True(confirm.IsSuccess);
        Assert.Equal("MEM-B1", Assert.Single(_metropol.ConfirmCalls).MemberId);
    }

    // MemberId'siz kullanıcı confirm edemez (CardsService.ConfirmAsync ile aynı kural).
    [Fact]
    public async Task ConfirmRecipientCard_without_member_id_returns_validation_error()
    {
        var result = await CreateService(TenantA, _userA2).ConfirmRecipientCardAsync(
            new ConfirmRecipientCardRequest("validation-guid-1", 123456));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
        Assert.Empty(_metropol.ConfirmCalls); // Metropol'e hiç gidilmez
    }

    // Geçersiz istek SMS kotası YAKMAZ ve Metropol'e gitmez (PII alan adlarıyla döner).
    [Fact]
    public async Task VerifyRecipientCard_missing_fields_returns_validation_error_without_quota_use()
    {
        var service = CreateService(TenantA, _userA1);

        var invalid = await service.VerifyRecipientCardAsync(new VerifyRecipientCardRequest(" ", ""));
        Assert.False(invalid.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, invalid.Error!.Code);
        Assert.Empty(_metropol.AddAccountCalls);

        // Kota harcanmadı: 5 geçerli istek hâlâ yapılabilir.
        for (var i = 0; i < 5; i++)
        {
            Assert.True((await service.VerifyRecipientCardAsync(
                new VerifyRecipientCardRequest("6375021912342976", "5551112233"))).IsSuccess);
        }
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
            CreateContext(tenantId, userId), tenantContext, _cipher, _metropol, _cache, _rateLimiter);
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

    /// <summary>
    /// Sayaçlı fake (PanelAuthServiceTests deseni): pencere süresi test boyunca dolmaz,
    /// yalnızca maxCount sınırı uygulanır — verify-card SMS kotası anahtar bazında sayılır.
    /// </summary>
    private sealed class CountingFakeRateLimiter : IRateLimiter
    {
        private readonly Dictionary<string, int> _counts = new();

        public Task<bool> TryAcquireAsync(
            string key, TimeSpan window, CancellationToken cancellationToken = default) =>
            TryAcquireAsync(key, window, maxCount: 1, cancellationToken);

        public Task<bool> TryAcquireAsync(
            string key, TimeSpan window, int maxCount, CancellationToken cancellationToken = default)
        {
            var current = _counts.GetValueOrDefault(key);
            if (current >= maxCount)
            {
                return Task.FromResult(false);
            }

            _counts[key] = current + 1;
            return Task.FromResult(true);
        }
    }
}
