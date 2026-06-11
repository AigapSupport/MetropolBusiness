using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Payments;

/// <summary>
/// Bakiye transferi use-case'leri (API_CONTRACT §8, TODO 1.7 backend).
/// Transfer parasal uçtur: Idempotency-Key ile çift gönderim engellenir (ARCHITECTURE §5.3).
/// Alıcı çözümleme tenant izolasyonuna tabidir (telefon yalnızca AYNI tenant'ta aranır).
/// </summary>
public interface ITransfersService
{
    /// <summary>
    /// BalanceTransfer proxy'si + idempotency: aynı anahtarla başarılı transfer TEKRAR
    /// Metropol'e gitmez; süren işlem 409 DUPLICATE_OPERATION. saveRecipient=true ise
    /// başarıda alıcı kayıt edilir (token şifreli).
    /// </summary>
    Task<Result<TransferResponse>> TransferAsync(
        TransferRequest request, string idempotencyKey, CancellationToken cancellationToken = default);

    /// <summary>QR payload'ından alıcı çözümleme (opak token; maskeli alanlar en iyi çaba).</summary>
    Task<Result<ResolveQrResponse>> ResolveQrAsync(
        string? qrPayload, CancellationToken cancellationToken = default);

    /// <summary>
    /// "Başka Karta" alıcı doğrulama 1/2 (AddAccount proxy'si): alıcının karta kayıtlı
    /// telefonuna OTP SMS'i başlatılır. SMS bombalamaya karşı kullanıcı başına rate-limit
    /// uygulanır (429 RATE_LIMITED). DB'ye yazılmaz; kart no/telefon LOGLANMAZ.
    /// </summary>
    Task<Result<VerifyRecipientCardResponse>> VerifyRecipientCardAsync(
        VerifyRecipientCardRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// "Başka Karta" alıcı doğrulama 2/2 (AddAccountConfirm proxy'si): OTP doğrulanır,
    /// alıcının kartı cards tablosuna KAYDEDİLMEZ — dönen opak receiverToken yalnızca
    /// transferde (receiver.type="card") kullanılır; isim/kart no maskeli döner.
    /// </summary>
    Task<Result<ConfirmRecipientCardResponse>> ConfirmRecipientCardAsync(
        ConfirmRecipientCardRequest request, CancellationToken cancellationToken = default);

    /// <summary>Kullanıcının kayıtlı alıcıları (tenant + kullanıcı filtreli).</summary>
    Task<Result<ItemsResponse<SavedRecipientDto>>> ListRecipientsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>Kayıtlı alıcı ekler (token at-rest şifreli; maskesiz kart no saklanmaz).</summary>
    Task<Result<SavedRecipientDto>> AddRecipientAsync(
        SaveRecipientRequest request, CancellationToken cancellationToken = default);

    /// <summary>Kendi kayıtlı alıcısını siler; başkasının kaydı NOT_FOUND.</summary>
    Task<Result<bool>> DeleteRecipientAsync(
        Guid recipientId, CancellationToken cancellationToken = default);
}
