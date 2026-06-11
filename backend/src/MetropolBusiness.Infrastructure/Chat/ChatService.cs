using System.Text.Json;
using MetropolBusiness.Application.Chat;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Chat;

/// <summary>
/// Sohbet REST iş mantığı (API_CONTRACT §10). Tüm sorgular tenant query filter'lı;
/// katılımcı olmayan kullanıcıya konuşma 404'tür (varlık bilgisi de sızdırılmaz).
/// </summary>
public sealed class ChatService(AppDbContext dbContext, ITenantContext tenantContext)
    : IChatService
{
    public async Task<Result<IReadOnlyList<ConversationListItemDto>>> GetConversationsAsync(
        CancellationToken ct = default)
    {
        var userId = RequiredUserId;

        // Liste başına son mesaj + okunmamış sayısı bellekte hesaplanır — konuşma
        // sayısı kullanıcı başına küçüktür; hacim büyürse projeksiyona alınır (yorum).
        var conversations = await dbContext.Conversations.AsNoTracking()
            .Include(c => c.Assistant)
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .Include(c => c.Messages)
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .ToListAsync(ct);

        var items = conversations
            .Select(c => ToListItem(c, userId))
            .OrderByDescending(c => c.LastAt ?? DateTimeOffset.MinValue)
            .ToList();

        return Result<IReadOnlyList<ConversationListItemDto>>.Ok(items);
    }

    public async Task<Result<PagedResponse<ChatMessageDto>>> GetMessagesAsync(
        Guid conversationId, int page, int pageSize, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        if (!await IsParticipantAsync(conversationId, ct))
        {
            return Result<PagedResponse<ChatMessageDto>>.Fail(ConversationNotFound);
        }

        var messages = await dbContext.Messages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .ToListAsync(ct);

        var ordered = messages.OrderBy(m => m.CreatedAt).ToList();
        var pageItems = ordered
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(m => ToMessageDto(m, userId))
            .ToList();

        return Result<PagedResponse<ChatMessageDto>>.Ok(
            new PagedResponse<ChatMessageDto>(pageItems, page, pageSize, ordered.Count));
    }

    public async Task<Result<ConversationListItemDto>> CreateConversationAsync(
        CreateConversationRequest request, CancellationToken ct = default)
    {
        var userId = RequiredUserId;

        return request.Type switch
        {
            "direct" => await CreateDirectAsync(userId, request.ParticipantUserId, ct),
            "assistant" => await CreateAssistantConversationAsync(userId, request.AssistantId, ct),
            _ => Result<ConversationListItemDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Geçersiz konuşma tipi (direct|assistant).", 400,
                new { field = "type" })),
        };
    }

    public async Task<IReadOnlyList<AssistantDto>> GetAssistantsAsync(CancellationToken ct = default)
    {
        var assistants = await dbContext.Assistants.AsNoTracking().ToListAsync(ct);
        // Persona listede dönmez (sistem prompt'u son kullanıcıya sızdırılmaz).
        return assistants
            .OrderBy(a => a.Name)
            .Select(a => new AssistantDto(a.Id, a.Name, null, a.AvatarUrl))
            .ToList();
    }

    public async Task<Result<AssistantDto>> CreateAssistantAsync(
        CreateAssistantRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Persona))
        {
            return Result<AssistantDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Ad ve kişilik (persona) zorunludur.", 400));
        }

        var assistant = new Assistant
        {
            CreatedBy = RequiredUserId,
            Name = request.Name.Trim(),
            Persona = request.Persona.Trim(),
            AvatarUrl = request.AvatarUrl,
        };
        dbContext.Assistants.Add(assistant);
        await dbContext.SaveChangesAsync(ct);

        return Result<AssistantDto>.Ok(
            new AssistantDto(assistant.Id, assistant.Name, assistant.Persona, assistant.AvatarUrl));
    }

    public async Task<IReadOnlyList<ChatUserDto>> SearchUsersAsync(
        string? query, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var users = await dbContext.Users.AsNoTracking()
            .Where(u => u.Id != userId && u.Status == EntityStatus.Active)
            .ToListAsync(ct);

        var trimmed = query?.Trim();
        var filtered = string.IsNullOrEmpty(trimmed)
            ? users
            : users.Where(u => FullName(u).Contains(trimmed, StringComparison.OrdinalIgnoreCase));

        return filtered
            .OrderBy(FullName)
            .Take(20)
            .Select(u => new ChatUserDto(u.Id, FullName(u), u.AvatarUrl))
            .ToList();
    }

    public Task<bool> IsParticipantAsync(Guid conversationId, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        return dbContext.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId, ct);
    }

    // ── Oluşturma akışları ───────────────────────────────────────────────────

    private async Task<Result<ConversationListItemDto>> CreateDirectAsync(
        Guid userId, Guid? participantUserId, CancellationToken ct)
    {
        if (participantUserId is null || participantUserId == userId)
        {
            return Result<ConversationListItemDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Geçerli bir katılımcı seçin.", 400,
                new { field = "participantUserId" }));
        }

        // Aynı tenant kontrolü: query filter diğer tenant'ın kullanıcısını zaten gizler →
        // bulunamayan kullanıcı 404 (tenant izolasyonu, PRD §9.3).
        var other = await dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == participantUserId && u.Status == EntityStatus.Active, ct);
        if (other is null)
        {
            return Result<ConversationListItemDto>.Fail(new Error(
                ErrorCodes.NotFound, "Kullanıcı bulunamadı.", 404));
        }

        // Aynı ikili için mevcut direct konuşma varsa ONU dön (mükerrer konuşma açılmaz).
        var existing = await dbContext.Conversations
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .Include(c => c.Messages)
            .Where(c => c.Type == ConversationType.Direct)
            .Where(c => c.Participants.Any(p => p.UserId == userId)
                && c.Participants.Any(p => p.UserId == participantUserId))
            .FirstOrDefaultAsync(ct);
        if (existing is not null)
        {
            return Result<ConversationListItemDto>.Ok(ToListItem(existing, userId));
        }

        var conversation = new Conversation
        {
            Type = ConversationType.Direct,
            Participants =
            {
                new ConversationParticipant { UserId = userId },
                new ConversationParticipant { UserId = participantUserId.Value },
            },
        };
        dbContext.Conversations.Add(conversation);
        await dbContext.SaveChangesAsync(ct);

        conversation.Participants.First(p => p.UserId == participantUserId).User = other;
        return Result<ConversationListItemDto>.Ok(ToListItem(conversation, userId));
    }

    private async Task<Result<ConversationListItemDto>> CreateAssistantConversationAsync(
        Guid userId, Guid? assistantId, CancellationToken ct)
    {
        if (assistantId is null)
        {
            return Result<ConversationListItemDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Asistan seçin.", 400, new { field = "assistantId" }));
        }

        var assistant = await dbContext.Assistants.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assistantId, ct);
        if (assistant is null)
        {
            return Result<ConversationListItemDto>.Fail(new Error(
                ErrorCodes.NotFound, "Asistan bulunamadı.", 404));
        }

        var existing = await dbContext.Conversations
            .Include(c => c.Assistant)
            .Include(c => c.Messages)
            .Where(c => c.Type == ConversationType.Assistant && c.AssistantId == assistantId)
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .FirstOrDefaultAsync(ct);
        if (existing is not null)
        {
            return Result<ConversationListItemDto>.Ok(ToListItem(existing, userId));
        }

        var conversation = new Conversation
        {
            Type = ConversationType.Assistant,
            AssistantId = assistant.Id,
            Participants = { new ConversationParticipant { UserId = userId } },
        };
        dbContext.Conversations.Add(conversation);
        await dbContext.SaveChangesAsync(ct);

        // Navigation yalnızca DTO eşlemesi için kayıttan SONRA bağlanır (AsNoTracking
        // nesnesini Add grafiğine koymak EF'in onu yeni kayıt sanmasına yol açar).
        conversation.Assistant = assistant;
        return Result<ConversationListItemDto>.Ok(ToListItem(conversation, userId));
    }

    // ── Eşlemeler ────────────────────────────────────────────────────────────

    private ConversationListItemDto ToListItem(Conversation conversation, Guid userId)
    {
        var lastMessage = conversation.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        var unread = conversation.Messages.Count(m =>
            m.SenderId != userId && !ReadBy(m).Contains(userId));

        string title;
        string? avatarUrl;
        if (conversation.Type == ConversationType.Assistant)
        {
            title = conversation.Assistant?.Name ?? "Asistan";
            avatarUrl = conversation.Assistant?.AvatarUrl;
        }
        else
        {
            var other = conversation.Participants.FirstOrDefault(p => p.UserId != userId)?.User;
            title = other is null ? "Sohbet" : FullName(other);
            avatarUrl = other?.AvatarUrl;
        }

        return new ConversationListItemDto(
            conversation.Id,
            EnumConverters.ConversationTypeToDb(conversation.Type),
            title,
            avatarUrl,
            lastMessage?.Content ?? string.Empty,
            lastMessage?.CreatedAt,
            unread,
            conversation.Type == ConversationType.Assistant);
    }

    private static ChatMessageDto ToMessageDto(Message message, Guid userId) => new(
        message.Id,
        EnumConverters.ChatSenderTypeToDb(message.SenderType),
        message.SenderId,
        message.Content,
        message.CreatedAt,
        message.SenderId == userId || ReadBy(message).Contains(userId));

    internal static HashSet<Guid> ReadBy(Message message)
    {
        try
        {
            return JsonSerializer.Deserialize<HashSet<Guid>>(message.ReadByJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string FullName(User user) =>
        string.Join(' ', new[] { user.FirstName, user.LastName }
            .Where(part => !string.IsNullOrWhiteSpace(part)));

    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException("Kullanıcı bağlamı yok.");

    private static readonly Error ConversationNotFound =
        new(ErrorCodes.NotFound, "Konuşma bulunamadı.", 404);
}
