using System.Text.Json;
using MetropolBusiness.Application.Chat;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Integration.Gemini;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MetropolBusiness.Infrastructure.Chat;

/// <summary>
/// Mesajlaşma iş mantığı (hub ince kalır). AI akışı (ARCHITECTURE §7/§8):
/// kullanıcı mesajı kalıcı yazılır → persona + son geçmiş Gemini'ye gider →
/// asistan cevabı da kalıcı yazılır (denetlenebilirlik). Sistem prompt'una
/// firma/kullanıcı PII'si KONMAZ (PRD §9.3).
/// </summary>
public sealed class ChatMessagingService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IGeminiClient gemini,
    ILogger<ChatMessagingService> logger) : IChatMessagingService
{
    /// <summary>Gemini'ye gönderilen geçmiş penceresi (maliyet/bağlam dengesi).</summary>
    private const int HistoryWindow = 20;

    public async Task<Result<SendMessageResult>> SendUserMessageAsync(
        Guid conversationId, string content, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        if (string.IsNullOrWhiteSpace(content))
        {
            return Result<SendMessageResult>.Fail(new Error(
                ErrorCodes.ValidationError, "Mesaj boş olamaz.", 400));
        }

        var conversation = await dbContext.Conversations.AsNoTracking()
            .Where(c => c.Id == conversationId)
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .FirstOrDefaultAsync(ct);
        if (conversation is null)
        {
            return Result<SendMessageResult>.Fail(ConversationNotFound);
        }

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = userId,
            SenderType = ChatSenderType.User,
            Content = content.Trim(),
        };
        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync(ct);

        return Result<SendMessageResult>.Ok(new SendMessageResult(
            new ChatMessageDto(message.Id, "user", userId, message.Content, message.CreatedAt, true),
            conversation.Type == ConversationType.Assistant));
    }

    public async Task<Result<ChatMessageDto>> GenerateAssistantReplyAsync(
        Guid conversationId, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var conversation = await dbContext.Conversations.AsNoTracking()
            .Include(c => c.Assistant)
            .Where(c => c.Id == conversationId && c.Type == ConversationType.Assistant)
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .FirstOrDefaultAsync(ct);
        if (conversation?.Assistant is null)
        {
            return Result<ChatMessageDto>.Fail(ConversationNotFound);
        }

        var recent = (await dbContext.Messages.AsNoTracking()
                .Where(m => m.ConversationId == conversationId)
                .ToListAsync(ct))
            .OrderBy(m => m.CreatedAt)
            .TakeLast(HistoryWindow)
            .Select(m => new GeminiTurn(
                m.SenderType == ChatSenderType.Assistant ? "model" : "user", m.Content))
            .ToList();

        // Persona admin tanımıdır; kurumsal sınır cümlesi her asistana eklenir (PII'siz).
        var systemPrompt = conversation.Assistant.Persona +
            "\n\nFirma içi kurumsal bir asistansın. Kişisel veri (TCKN, kart numarası, telefon) isteme ve paylaşma.";

        string reply;
        try
        {
            reply = await gemini.GenerateReplyAsync(systemPrompt, recent, ct);
        }
        catch (Exception ex) when (ex is InvalidOperationException or HttpRequestException or TaskCanceledException)
        {
            // İçerik/anahtar log'lanmaz; yalnız konuşma id'si (PII değil).
            logger.LogWarning("Gemini yanıtı alınamadı (conversation {ConversationId}).", conversationId);
            return Result<ChatMessageDto>.Fail(new Error(
                ErrorCodes.ProviderUnavailable, "Asistan şu an yanıt veremiyor.", 503));
        }

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = null,
            SenderType = ChatSenderType.Assistant,
            Content = reply,
        };
        dbContext.Messages.Add(message);
        await dbContext.SaveChangesAsync(ct);

        return Result<ChatMessageDto>.Ok(new ChatMessageDto(
            message.Id, "assistant", null, message.Content, message.CreatedAt, true));
    }

    public async Task<Result<bool>> MarkReadAsync(
        Guid conversationId, Guid messageId, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var target = await dbContext.Messages.AsNoTracking()
            .Where(m => m.Id == messageId && m.ConversationId == conversationId)
            .Where(m => m.Conversation!.Participants.Any(p => p.UserId == userId))
            .FirstOrDefaultAsync(ct);
        if (target is null)
        {
            return Result<bool>.Fail(ConversationNotFound);
        }

        // Hedef mesaja kadar (dahil) okunmamışları işaretle. CreatedAt karşılaştırması
        // bellekte: SQLite DateTimeOffset sıralamasını çeviremez (repo genel deseni).
        var unread = (await dbContext.Messages
                .Where(m => m.ConversationId == conversationId)
                .Where(m => m.SenderId != userId)
                .ToListAsync(ct))
            .Where(m => m.CreatedAt <= target.CreatedAt)
            .ToList();

        foreach (var message in unread)
        {
            var readers = ChatService.ReadBy(message);
            if (readers.Add(userId))
            {
                message.ReadByJson = JsonSerializer.Serialize(readers);
            }
        }

        await dbContext.SaveChangesAsync(ct);
        return Result<bool>.Ok(true);
    }

    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException("Kullanıcı bağlamı yok.");

    private static readonly Error ConversationNotFound =
        new(ErrorCodes.NotFound, "Konuşma bulunamadı.", 404);
}
