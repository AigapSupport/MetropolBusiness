namespace MetropolBusiness.Application.Payments;

// Transfer DTO'ları — docs/API_CONTRACT.md §8 alanlarıyla birebir.
// Para alanları STRING ("500.00"); alıcı isim/kart no istemciye YALNIZCA maskeli gider.

/// <summary>Alıcı türü sabitleri (API_CONTRACT §8 receiver.type sözlüğü).</summary>
public static class TransferReceiverTypes
{
    /// <summary>[!] Desteklenmiyor: tam kart no bizde tutulmaz, Metropol'de no→token ucu yok (LESSONS.md).</summary>
    public const string Card = "card";

    /// <summary>QR'dan çözülen OPAK alıcı token'ı (resolve-qr çıktısı).</summary>
    public const string Qr = "qr";

    /// <summary>AYNI TENANT'ta telefonla aktif kullanıcı → onun aktif kartı.</summary>
    public const string Phone = "phone";

    /// <summary>Kayıtlı alıcı id'si (saved_recipients, yalnızca kendi kayıtları).</summary>
    public const string Saved = "saved";
}

/// <summary>Transfer alıcısı: { type: "card|qr|phone|saved", value: türe göre değer }.</summary>
public sealed record TransferReceiverDto(string Type, string Value);

/// <summary>
/// POST /metropol/transfer isteği (Metropol BalanceTransfer proxy'si, Idempotency-Key zorunlu).
/// amount TAM TL olmalıdır (Metropol BalanceTransferRequest.Amount int — LESSONS.md varsayımı).
/// </summary>
public sealed record TransferRequest(
    Guid SenderCardId,
    TransferReceiverDto Receiver,
    int WalletId,
    string Amount,
    string? Note,
    bool SaveRecipient,
    string? RecipientLabel);

/// <summary>POST /metropol/transfer yanıtı — başarı fişi (alıcı alanları maskeli).</summary>
public sealed record TransferResponse(
    bool Success,
    string SenderName,
    string ReceiverMaskedName,
    string ReceiverMaskedCardNo,
    string Amount,
    string Date);

/// <summary>POST /metropol/transfer/resolve-qr isteği.</summary>
public sealed record ResolveQrRequest(string QrPayload);

/// <summary>
/// POST /metropol/transfer/resolve-qr yanıtı: receiverToken OPAK'tır (transfer'de
/// receiver.type="qr" value'su olarak geri gönderilir); maskeli alanlar payload'dan
/// çözülemezse "***" yer tutucudur (VARSAYIM, LESSONS.md).
/// </summary>
public sealed record ResolveQrResponse(
    string ReceiverMaskedName,
    string ReceiverMaskedCardNo,
    string ReceiverToken);

/// <summary>GET /metropol/saved-recipients öğesi: { id, label, maskedCardNo }.</summary>
public sealed record SavedRecipientDto(
    Guid Id,
    string Label,
    string MaskedCardNo);

/// <summary>
/// POST /metropol/saved-recipients isteği: receiverToken OPAK alıcı token'ı
/// (resolve-qr çıktısı) — at-rest ŞİFRELİ saklanır; maskedCardNo opsiyoneldir,
/// maskesiz gelirse backend maskeler (CLAUDE.md kural 4).
/// </summary>
public sealed record SaveRecipientRequest(
    string Label,
    string ReceiverToken,
    string? MaskedCardNo);
