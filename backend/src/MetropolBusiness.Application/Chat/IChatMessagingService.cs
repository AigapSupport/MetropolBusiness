using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Chat;

/// <summary>Gönderim sonucu: mesaj + konuşma asistan tipinde mi (hub AI akışını tetikler).</summary>
public sealed record SendMessageResult(ChatMessageDto Message, bool IsAssistantConversation);

/// <summary>
/// Mesajlaşma iş mantığı — hub İNCE kalsın, mantık test edilebilir olsun diye ayrı
/// (SignalR hub'ı yalnızca bu servisi çağırıp yayın yapar).
/// </summary>
public interface IChatMessagingService
{
    /// <summary>Kullanıcı mesajını doğrular (katılımcı + içerik) ve kalıcı yazar.</summary>
    Task<Result<SendMessageResult>> SendUserMessageAsync(
        Guid conversationId, string content, CancellationToken ct = default);

    /// <summary>
    /// Asistan cevabı üretir (persona + son geçmiş → Gemini) ve kalıcı yazar.
    /// Gemini hatasında PROVIDER_UNAVAILABLE döner — kullanıcı mesajı zaten kayıtlıdır.
    /// </summary>
    Task<Result<ChatMessageDto>> GenerateAssistantReplyAsync(
        Guid conversationId, CancellationToken ct = default);

    /// <summary>Verilen mesaja kadar (dahil) okundu işaretler; Read yayını hub'dadır.</summary>
    Task<Result<bool>> MarkReadAsync(
        Guid conversationId, Guid messageId, CancellationToken ct = default);
}
