using MetropolBusiness.Application.Chat;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Chat;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Integration.Gemini;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace MetropolBusiness.UnitTests.Chat;

/// <summary>
/// Sohbet (TODO 2.3): konuşma oluşturma/tekilleştirme, tenant izolasyonu,
/// katılımcı kontrolü, AI akışı (fake Gemini), okundu/unread.
/// </summary>
public sealed class ChatServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly SqliteConnection _connection;
    private readonly FakeGeminiClient _gemini = new();
    private readonly Guid _userA1 = Guid.NewGuid();
    private readonly Guid _userA2 = Guid.NewGuid();
    private readonly Guid _userB1 = Guid.NewGuid();
    private readonly Guid _assistantA = Guid.NewGuid();

    public ChatServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "A", Code = "A", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "B", Code = "B", Status = TenantStatus.Active });
        seed.Users.AddRange(
            new User { Id = _userA1, TenantId = TenantA, Phone = "1", FirstName = "Ali", LastName = "Bir" },
            new User { Id = _userA2, TenantId = TenantA, Phone = "2", FirstName = "Ayşe", LastName = "İki" },
            new User { Id = _userB1, TenantId = TenantB, Phone = "1", FirstName = "Burak", LastName = "Üç" });
        seed.Assistants.Add(new Assistant
        {
            Id = _assistantA, TenantId = TenantA, CreatedBy = _userA1,
            Name = "Gider Botu", Persona = "Masraf süreçlerinde yardımcı ol.",
        });
        seed.SaveChanges();
    }

    // ── Konuşma oluşturma ────────────────────────────────────────────────────

    [Fact]
    public async Task Direct_conversation_is_created_once_for_same_pair()
    {
        var first = await CreateChatService(_userA1).CreateConversationAsync(
            new CreateConversationRequest("direct", _userA2, null));
        Assert.True(first.IsSuccess);
        Assert.Equal("Ayşe İki", first.Value.Title);

        // Karşı taraf da açsa AYNI konuşma döner (mükerrer açılmaz).
        var second = await CreateChatService(_userA2).CreateConversationAsync(
            new CreateConversationRequest("direct", _userA1, null));

        Assert.True(second.IsSuccess);
        Assert.Equal(first.Value.Id, second.Value.Id);
    }

    [Fact]
    public async Task Direct_conversation_with_other_tenant_user_is_not_found()
    {
        // B tenant'ının kullanıcısı A'dan görünmez (PRD §9.3 izolasyon).
        var result = await CreateChatService(_userA1).CreateConversationAsync(
            new CreateConversationRequest("direct", _userB1, null));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
    }

    [Fact]
    public async Task Non_participant_cannot_read_messages()
    {
        var conversation = await CreateDirectAsync(_userA1, _userA2);

        // Aynı tenant'tan bile olsa katılımcı olmayan kullanıcı 404 alır.
        var outsider = Guid.NewGuid();
        using (var seed = CreateContext(null, null))
        {
            seed.Users.Add(new User { Id = outsider, TenantId = TenantA, Phone = "9" });
            seed.SaveChanges();
        }

        var result = await CreateChatService(outsider).GetMessagesAsync(conversation, 1, 30);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, result.Error!.Code);
    }

    // ── Mesajlaşma + okundu ─────────────────────────────────────────────────

    [Fact]
    public async Task Sent_message_persists_and_unread_count_drops_after_mark_read()
    {
        var conversation = await CreateDirectAsync(_userA1, _userA2);

        var sent = await CreateMessaging(_userA1).SendUserMessageAsync(conversation, "Merhaba!");
        Assert.True(sent.IsSuccess);
        Assert.False(sent.Value.IsAssistantConversation);

        var listForReceiver = await CreateChatService(_userA2).GetConversationsAsync();
        var item = Assert.Single(listForReceiver.Value, c => c.Id == conversation);
        Assert.Equal(1, item.UnreadCount);
        Assert.Equal("Merhaba!", item.LastMessage);

        var marked = await CreateMessaging(_userA2).MarkReadAsync(conversation, sent.Value.Message.Id);
        Assert.True(marked.IsSuccess);

        var after = await CreateChatService(_userA2).GetConversationsAsync();
        Assert.Equal(0, Assert.Single(after.Value, c => c.Id == conversation).UnreadCount);
    }

    // ── AI akışı ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Assistant_reply_uses_persona_and_history_and_persists_both_messages()
    {
        var conversation = await CreateAssistantConversationAsync(_userA1);

        var sent = await CreateMessaging(_userA1).SendUserMessageAsync(conversation, "Fiş nasıl yüklerim?");
        Assert.True(sent.IsSuccess);
        Assert.True(sent.Value.IsAssistantConversation);

        var reply = await CreateMessaging(_userA1).GenerateAssistantReplyAsync(conversation);

        Assert.True(reply.IsSuccess);
        Assert.Equal("assistant", reply.Value.SenderType);
        Assert.Equal("Sahte asistan cevabı", reply.Value.Content);
        // Persona sistem prompt'unda + kurumsal PII sınır cümlesi.
        Assert.StartsWith("Masraf süreçlerinde yardımcı ol.", _gemini.LastSystemPrompt);
        Assert.Contains("Kişisel veri", _gemini.LastSystemPrompt);
        // Geçmiş: kullanıcının mesajı "user" rolüyle gitti.
        var turn = Assert.Single(_gemini.LastHistory!);
        Assert.Equal(("user", "Fiş nasıl yüklerim?"), (turn.Role, turn.Text));

        using var verify = CreateContext(TenantA, _userA1);
        Assert.Equal(2, verify.Messages.Count(m => m.ConversationId == conversation));
    }

    [Fact]
    public async Task Gemini_failure_keeps_user_message_and_returns_provider_unavailable()
    {
        var conversation = await CreateAssistantConversationAsync(_userA1);
        await CreateMessaging(_userA1).SendUserMessageAsync(conversation, "Soru");
        _gemini.FailNext = true;

        var reply = await CreateMessaging(_userA1).GenerateAssistantReplyAsync(conversation);

        Assert.False(reply.IsSuccess);
        Assert.Equal(ErrorCodes.ProviderUnavailable, reply.Error!.Code);
        using var verify = CreateContext(TenantA, _userA1);
        // Kullanıcı mesajı kayıtlı kaldı; asistan mesajı YAZILMADI.
        Assert.Equal(1, verify.Messages.Count(m => m.ConversationId == conversation));
    }

    // ── Asistan + kullanıcı arama ────────────────────────────────────────────

    [Fact]
    public async Task Assistant_list_hides_persona()
    {
        var assistants = await CreateChatService(_userA1).GetAssistantsAsync();

        var assistant = Assert.Single(assistants);
        Assert.Equal("Gider Botu", assistant.Name);
        Assert.Null(assistant.Persona); // sistem prompt'u son kullanıcıya sızmaz
    }

    [Fact]
    public async Task User_search_excludes_self_and_other_tenants()
    {
        var users = await CreateChatService(_userA1).SearchUsersAsync(null);

        var user = Assert.Single(users);
        Assert.Equal(_userA2, user.Id);
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private async Task<Guid> CreateDirectAsync(Guid userId, Guid otherId)
    {
        var result = await CreateChatService(userId).CreateConversationAsync(
            new CreateConversationRequest("direct", otherId, null));
        Assert.True(result.IsSuccess);
        return result.Value.Id;
    }

    private async Task<Guid> CreateAssistantConversationAsync(Guid userId)
    {
        var result = await CreateChatService(userId).CreateConversationAsync(
            new CreateConversationRequest("assistant", null, _assistantA));
        Assert.True(result.IsSuccess);
        Assert.True(result.Value.IsAssistant);
        return result.Value.Id;
    }

    private ChatService CreateChatService(Guid userId) =>
        new(CreateContext(TenantA, userId), new StubTenantContext(TenantA, userId));

    private ChatMessagingService CreateMessaging(Guid userId) =>
        new(CreateContext(TenantA, userId), new StubTenantContext(TenantA, userId),
            _gemini, NullLogger<ChatMessagingService>.Instance);

    private AppDbContext CreateContext(Guid? tenantId, Guid? userId)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new AppDbContext(options, new StubTenantContext(tenantId, userId));
    }

    public void Dispose() => _connection.Dispose();

    private sealed class StubTenantContext(Guid? tenantId, Guid? userId = null) : ITenantContext
    {
        public Guid? TenantId => tenantId;
        public Guid? UserId => userId;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId => TenantId ?? throw new InvalidOperationException();
    }

    private sealed class FakeGeminiClient : IGeminiClient
    {
        public string? LastSystemPrompt { get; private set; }
        public IReadOnlyList<GeminiTurn>? LastHistory { get; private set; }
        public bool FailNext { get; set; }

        public Task<string> GenerateReplyAsync(
            string systemPrompt, IReadOnlyList<GeminiTurn> history, CancellationToken ct = default)
        {
            LastSystemPrompt = systemPrompt;
            LastHistory = history;

            return FailNext
                ? throw new InvalidOperationException("Sahte Gemini hatası")
                : Task.FromResult("Sahte asistan cevabı");
        }
    }
}
