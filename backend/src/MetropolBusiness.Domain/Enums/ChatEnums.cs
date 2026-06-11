namespace MetropolBusiness.Domain.Enums;

/// <summary>Konuşma tipi (ARCHITECTURE §4.5): direct = birebir, assistant = AI asistan.</summary>
public enum ConversationType
{
    Direct,
    Assistant,
}

/// <summary>Mesaj göndereni: user = tenant kullanıcısı, assistant = AI (SenderId null).</summary>
public enum ChatSenderType
{
    User,
    Assistant,
}
