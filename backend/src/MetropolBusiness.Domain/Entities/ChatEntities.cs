using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// AI asistan (ARCHITECTURE §4.5 assistants). Firma admin tanımlar, tüm tenant
/// kullanıcıları sohbet eder (PRD §17.2: scope=tenant; kişisel scope ileride).
/// Persona sistem prompt'udur — son kullanıcıya SIZDIRILMAZ (yalnız admin görür).
/// </summary>
public class Assistant : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid CreatedBy { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>Sistem prompt'u/kişilik — Gemini'ye gider, istemci listelerinde dönmez.</summary>
    public string Persona { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    /// <summary>İlk sürümde hep "tenant" (PRD §17.2).</summary>
    public string Scope { get; set; } = "tenant";
}

/// <summary>Konuşma (ARCHITECTURE §4.5 conversations) — birebir veya asistan.</summary>
public class Conversation : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public ConversationType Type { get; set; }

    public Guid? AssistantId { get; set; }
    public Assistant? Assistant { get; set; }

    public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

/// <summary>Konuşma katılımcısı (PK: ConversationId+UserId).</summary>
public class ConversationParticipant
{
    public Guid ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}

/// <summary>
/// Mesaj (ARCHITECTURE §4.5 messages). AI cevapları da burada saklanır (denetlenebilirlik,
/// ARCHITECTURE §8); SenderId null + SenderType=Assistant. ReadByJson: okuyan kullanıcı
/// id'lerinin JSON dizisi (read_by jsonb).
/// </summary>
public class Message : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

    /// <summary>Null = AI asistan mesajı.</summary>
    public Guid? SenderId { get; set; }

    public ChatSenderType SenderType { get; set; }
    public string Content { get; set; } = string.Empty;

    /// <summary>Okuyan kullanıcı id'leri (JSON dizi) — read_by jsonb.</summary>
    public string ReadByJson { get; set; } = "[]";
}
