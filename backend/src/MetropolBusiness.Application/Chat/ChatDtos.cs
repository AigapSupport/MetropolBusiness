namespace MetropolBusiness.Application.Chat;

/// <summary>docs/API_CONTRACT.md §10 — CHAT DTO'ları.</summary>
public sealed record ConversationListItemDto(
    Guid Id, string Type, string Title, string? AvatarUrl,
    string LastMessage, DateTimeOffset? LastAt, int UnreadCount, bool IsAssistant);

public sealed record ChatMessageDto(
    Guid Id, string SenderType, Guid? SenderId, string Content,
    DateTimeOffset CreatedAt, bool ReadByMe);

/// <summary>type=direct → participantUserId; type=assistant → assistantId.</summary>
public sealed record CreateConversationRequest(
    string Type, Guid? ParticipantUserId, Guid? AssistantId);

/// <summary>
/// Persona yalnızca oluşturma yanıtında döner; listelerde null — sistem prompt'u
/// son kullanıcıya sızdırılmaz (admin içerik kontrolü, PRD §17.2).
/// </summary>
public sealed record AssistantDto(Guid Id, string Name, string? Persona, string? AvatarUrl);

public sealed record CreateAssistantRequest(string Name, string Persona, string? AvatarUrl);

public sealed record ChatUserDto(Guid Id, string Name, string? AvatarUrl);
