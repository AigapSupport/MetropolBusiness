using MetropolBusiness.Application.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MetropolBusiness.Api.Hubs;

/// <summary>
/// Sohbet hub'ı (API_CONTRACT §10, ARCHITECTURE §7). İNCE tutulur: iş mantığı
/// IChatMessagingService'te (test edilebilirlik). Bağlantı JWT ile doğrulanır
/// (access_token query — Program.cs OnMessageReceived); katılımcı olmayan kullanıcı
/// gruba alınmaz. Redis backplane YOK (tek instance; çoklu instance'ta eklenecek).
/// Hub Api projesindedir: SignalR transport HTTP barındırma katmanına aittir,
/// Infrastructure/Realtime klasörü backplane implementasyonu için ayrılmıştır.
/// </summary>
[Authorize]
public sealed class ChatHub(IChatService chatService, IChatMessagingService messaging) : Hub
{
    private static string GroupName(Guid conversationId) => $"conv:{conversationId}";

    /// <summary>Konuşma grubuna katılım — yalnızca katılımcılar (tenant izolasyonu).</summary>
    public async Task JoinConversation(Guid conversationId)
    {
        if (await chatService.IsParticipantAsync(conversationId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(conversationId));
        }
    }

    public async Task SendMessage(Guid conversationId, string content)
    {
        var sent = await messaging.SendUserMessageAsync(conversationId, content);
        if (!sent.IsSuccess)
        {
            // Hata yalnızca gönderene iletilir (zarf alanlarıyla).
            await Clients.Caller.SendAsync("Error", sent.Error!.Code, sent.Error.Message);
            return;
        }

        await Clients.Group(GroupName(conversationId))
            .SendAsync("ReceiveMessage", conversationId, sent.Value.Message);

        if (!sent.Value.IsAssistantConversation)
        {
            return;
        }

        // AI akışı: "yazıyor..." → Gemini → cevap (PRD §9.1).
        await Clients.Group(GroupName(conversationId)).SendAsync("AssistantTyping", conversationId);

        var reply = await messaging.GenerateAssistantReplyAsync(conversationId);
        if (reply.IsSuccess)
        {
            await Clients.Group(GroupName(conversationId))
                .SendAsync("ReceiveMessage", conversationId, reply.Value);
        }
        else
        {
            // Kullanıcı mesajı kayıtlı kaldı; hata yalnızca gönderene bildirilir.
            await Clients.Caller.SendAsync("Error", reply.Error!.Code, reply.Error.Message);
        }
    }

    public async Task Typing(Guid conversationId)
    {
        if (await chatService.IsParticipantAsync(conversationId))
        {
            await Clients.OthersInGroup(GroupName(conversationId))
                .SendAsync("Typing", conversationId, Context.UserIdentifier);
        }
    }

    public async Task MarkRead(Guid conversationId, Guid messageId)
    {
        var result = await messaging.MarkReadAsync(conversationId, messageId);
        if (result.IsSuccess)
        {
            await Clients.OthersInGroup(GroupName(conversationId))
                .SendAsync("Read", conversationId, Context.UserIdentifier, messageId);
        }
    }
}
