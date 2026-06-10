namespace MetropolBusiness.Integration.Metropol.Models;

// GEÇİCİ MİNİMAL TİPLER — yalnızca token akışı (CLAUDE.md §6) için.
// Gerçek Metropol sözleşme dosyası (MetropolModels.cs) henüz sağlanmadı (bkz. LESSONS.md);
// dosya gelince bu tipler onunla BİRLEŞTİRİLECEK ve alan adları/kodlama teyit edilecek.
// MetropolModels.cs placeholder'ına DOKUNULMAZ (CLAUDE.md kural 6: sözleşme uydurulmaz).

/// <summary>
/// GenerateToken isteğinde AES ile şifrelenip SecureAccessData'ya dönüşen içerik.
/// CreateDate, saat farkı tuzağına karşı getdate servisinden dönen sunucu zamanıdır (CLAUDE.md §6).
/// VARSAYIM: alan adları ve JSON biçimi gerçek MetropolModels.cs ile teyit edilecek.
/// </summary>
public sealed record AccessData(string AccessKey, string CreateDate);

/// <summary>
/// GenerateToken sonucu: Bearer olarak kullanılacak token + geçerlilik süresi
/// (Metropol token'ı ~5 dk geçerlidir; saniye cinsinden).
/// </summary>
public sealed record MetropolTokenResult(string Token, int ExpirationSeconds);
