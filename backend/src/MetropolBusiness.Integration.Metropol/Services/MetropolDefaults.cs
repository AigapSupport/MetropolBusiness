namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// BELGESİZ Metropol semantikleri için isimli sabitler (LESSONS.md "Belgesiz Metropol
/// semantikleri" bölümü). Buradaki her değer VARSAYIMDIR — Metropol test ortamında
/// teyit edilince yorumlar güncellenecek; değerler tek yerden değişir.
/// </summary>
public static class MetropolDefaults
{
    /// <summary>
    /// VARSAYIM: UserRefType = 2 → "token" referans türü; UserRefNo alanına çözülmüş
    /// UserAccountToken konur (DeleteUser, BalanceQuery). Sözleşme dokümanında tür
    /// sözlüğü yok; AddAccountConfirm'in tek kalıcı çıktısının token olmasından çıkarıldı.
    /// </summary>
    public const int TokenUserRefType = 2;

    /// <summary>
    /// <see cref="TokenUserRefType"/>'ın string biçimi — DeleteUserRequest.UserRefType
    /// sözleşmede string'dir (BalanceQueryRequest.UserRefType int; MetropolModels DEĞİŞTİRİLMEZ).
    /// </summary>
    public const string TokenUserRefTypeText = "2";

    /// <summary>
    /// VARSAYIM: BalanceQuery'de WalletId = 0 → TÜM cüzdanlar döner (Resto + Gift).
    /// Sözleşmede "tümü" değeri belgelenmemiş; 0'ın geçersiz/atanmamış cüzdan kimliği
    /// olmasından çıkarıldı (API_CONTRACT §6: varsayılan tüm cüzdanlar).
    /// </summary>
    public const int AllWalletsId = 0;

    /// <summary>
    /// VARSAYIM: TransactionHistory.TranTypeId = 1 → satış (sale); diğer tüm kodlar
    /// transfer benzeri hareket (transfer). Tam tip tablosu belgesiz — doküman gelince
    /// <see cref="MapTranType"/> eşlemesi genişletilecek.
    /// </summary>
    public const int SaleTranTypeId = 1;

    /// <summary>
    /// TranTypeId → bizim sözleşme "type" değeri ("sale" | "transfer", API_CONTRACT §6).
    /// Bilinmeyen kodlar güvenli tarafta "transfer" kabul edilir (yukarıdaki varsayım).
    /// </summary>
    public static string MapTranType(int tranTypeId) =>
        tranTypeId == SaleTranTypeId ? "sale" : "transfer";

    /// <summary>BELGELİ (CLAUDE.md §6): GetPreSaleInfo CodeType = 1 → QR kod.</summary>
    public const int QrCodeType = 1;

    /// <summary>BELGELİ (CLAUDE.md §6): GetPreSaleInfo CodeType = 2 → kısa kod (QuickCode).</summary>
    public const int QuickCodeType = 2;

    /// <summary>BELGELİ (CLAUDE.md §13): WalletId 1 = Resto cüzdanı.</summary>
    public const int RestoWalletId = 1;

    /// <summary>BELGELİ (CLAUDE.md §13): WalletId 3 = Gift cüzdanı (ProductId 3 ürünleri).</summary>
    public const int GiftWalletId = 3;

    /// <summary>Gift cüzdanına eşlenen ProductId (CLAUDE.md §6: ProductId 3 → WalletId 3).</summary>
    public const int GiftProductId = 3;

    /// <summary>
    /// VARSAYIM: SaleConfirm PaymentInfo.PaymentTypeId = 1 → cüzdan (kart bakiyesi) ödemesi.
    /// Tür sözlüğü belgesiz (LESSONS.md "Belgesiz Metropol semantikleri"); tek ödeme aracımız
    /// kart cüzdanı olduğundan 1 varsayıldı — Metropol test ortamında teyit edilecek.
    /// BankRefCode da aynı nedenle cüzdan ödemesinde boş ("") gönderilir.
    /// </summary>
    public const int WalletPaymentTypeId = 1;

    /// <summary>
    /// GetPreSaleInfo ProductId → önerilen WalletId (CLAUDE.md §6 kuralı):
    /// ProductId 1 → WalletId 1 (Resto), ProductId 3 → WalletId 3 (Gift).
    /// VARSAYIM: kural yalnızca 1 ve 3 için belgeli; bilinmeyen ürünler (örn. 2)
    /// güvenli tarafta Resto'ya (1) eşlenir — LESSONS.md, Metropol testinde teyit edilecek.
    /// </summary>
    public static int SuggestedWalletId(int productId) =>
        productId == GiftProductId ? GiftWalletId : RestoWalletId;
}
