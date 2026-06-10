namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// Metropol ResponseCode → kullanıcıya gösterilebilir Türkçe mesaj eşlemesi
/// (CLAUDE.md §6: ResponseCode = 0 başarı; 0 dışı kodlar hata, ham kod istemciye gösterilmez).
/// Tablo KISMİDİR: yalnızca eldeki dokümanda geçen kodlar eklendi; tam tablo
/// (GetPreSaleInfo / SaleConfirm metot tabloları) gerçek Metropol dokümanı sağlanınca genişletilecek.
/// </summary>
public static class MetropolErrorCatalog
{
    /// <summary>Metropol sözleşmesinde başarıyı ifade eden tek kod.</summary>
    public const int SuccessCode = 0;

    private static readonly IReadOnlyDictionary<int, string> Messages = new Dictionary<int, string>
    {
        [7601] = "Süresi geçmiş QR kod. Tekrar Deneyiniz.",
        [7085] = "Alışveriş başarısız.",
    };

    /// <summary>ResponseCode başarı mı? (yalnızca 0 başarıdır).</summary>
    public static bool IsSuccess(int responseCode) => responseCode == SuccessCode;

    /// <summary>
    /// Hata kodunun Türkçe kullanıcı mesajını döner; bilinmeyen kodlar için genel mesaj üretir
    /// (kod parantez içinde destek/izlenebilirlik amacıyla yer alır, PII içermez).
    /// </summary>
    public static string GetMessage(int responseCode) =>
        Messages.TryGetValue(responseCode, out var message)
            ? message
            : $"İşlem gerçekleştirilemedi. ({responseCode})";
}
