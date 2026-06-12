namespace MetropolBusiness.Application.Cards;

// Kart DTO'ları — docs/API_CONTRACT.md §5 alanlarıyla birebir.
// JSON serileştirme ASP.NET Core varsayılanıyla otomatik camelCase'dir.
// PII kuralı: kart no istemciye YALNIZCA maskeli gider; UserAccountToken hiç dönmez/log'lanmaz.

/// <summary>GET /metropol/cards listesi öğesi: { id, maskedCardNo, holderName, status }.</summary>
public sealed record CardSummaryDto(
    Guid Id,
    string MaskedCardNo,
    string? HolderName,
    string Status);

/// <summary>
/// POST /metropol/cards/add isteği (Metropol AddAccount proxy'si).
/// MobilePhone OPSİYONEL (karar 2026-06-12): boşsa oturum sahibinin hesabındaki
/// telefon kullanılır; istemci yalnız hesapta telefon yoksa alan gösterir.
/// </summary>
public sealed record AddCardRequest(string CardNo, string? MobilePhone = null);

/// <summary>POST /metropol/cards/add yanıtı: SMS OTP gönderildi, doğrulama için saklanacak guid.</summary>
public sealed record AddCardResponse(string ValidationGuid);

/// <summary>
/// POST /metropol/cards/confirm isteği (Metropol AddAccountConfirm proxy'si).
/// MemberId sözleşme alanı olarak alınır ama Metropol'e GÖNDERİLMEZ — güvenlik gereği
/// kullanıcının users.member_id değeri kullanılır (istemci başkasının MemberId'sini deneyemez;
/// boşsa sunucu üretir — karar 2026-06-12). Phone boşsa hesaptaki telefon kullanılır.
/// Name/Surname/Email artık istemciden İSTENMEZ (karar 2026-06-12); alanlar yalnız
/// geriye uyumluluk için durur — Name/Surname Metropol yanıtı boş dönerse gösterimi
/// zenginleştirir, Email boşsa hesaptaki e-posta gönderilir.
/// </summary>
public sealed record ConfirmCardRequest(
    string ValidationGuid,
    int ValidationCode,
    string? MemberId = null,
    string? Name = null,
    string? Surname = null,
    string? Email = null,
    string? Phone = null,
    string? Tckn = null);

/// <summary>POST /metropol/cards/confirm yanıtı (201): { cardId, maskedCardNo, name, surName }.</summary>
public sealed record ConfirmCardResponse(
    Guid CardId,
    string MaskedCardNo,
    string? Name,
    string? SurName);
