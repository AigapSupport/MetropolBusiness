using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Chat;

/// <summary>
/// Sohbet REST uçları (API_CONTRACT §10). Sohbet YALNIZCA aynı tenant içindedir
/// (PRD §9.3) — query filter + katılımcı kontrolleriyle zorlanır.
/// </summary>
public interface IChatService
{
    Task<Result<IReadOnlyList<ConversationListItemDto>>> GetConversationsAsync(CancellationToken ct = default);

    Task<Result<PagedResponse<ChatMessageDto>>> GetMessagesAsync(
        Guid conversationId, int page, int pageSize, CancellationToken ct = default);

    Task<Result<ConversationListItemDto>> CreateConversationAsync(
        CreateConversationRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<AssistantDto>> GetAssistantsAsync(CancellationToken ct = default);

    Task<Result<AssistantDto>> CreateAssistantAsync(
        CreateAssistantRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<ChatUserDto>> SearchUsersAsync(string? query, CancellationToken ct = default);

    /// <summary>Hub JoinConversation doğrulaması: kullanıcı bu konuşmanın katılımcısı mı?</summary>
    Task<bool> IsParticipantAsync(Guid conversationId, CancellationToken ct = default);
}
