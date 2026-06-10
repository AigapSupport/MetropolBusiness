namespace MetropolBusiness.Application.Common;

/// <summary>
/// Hassas alanların (TCKN vb.) at-rest şifrelemesi için soyutlama (ARCHITECTURE §10).
/// Düz metin DB'ye asla yazılmaz; servisler bu arayüz üzerinden şifreler/çözer.
/// Implementasyon Infrastructure'dadır — şimdilik PlaceholderFieldCipher (Base64),
/// gerçek şifreleme (DataProtection/KMS) Faz sonrası bu arayüzün arkasında değişir.
/// </summary>
public interface IFieldCipher
{
    /// <summary>Düz metni saklanabilir şifreli forma çevirir.</summary>
    string Encrypt(string plaintext);

    /// <summary>
    /// Şifreli değeri çözer; biçim tanınmıyorsa null döner (exception ile akış kontrolü yok).
    /// Çözülen değer LOG'LANMAZ — yalnızca maskeleme girdisi olarak kullanılır.
    /// </summary>
    string? Decrypt(string? ciphertext);
}
