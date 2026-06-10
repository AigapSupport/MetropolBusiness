using System.Security.Cryptography;
using System.Text;

namespace MetropolBusiness.Integration.Metropol.Crypto;

/// <summary>
/// Metropol SecureAccessData şifrelemesi (CLAUDE.md §6 token akışı):
/// AES CBC / PKCS7 / IV = 16 baytlık sıfır dizisi / 128-bit anahtar (BlockSize 128). Çıktı Base64.
/// IV sabit (sıfır) olduğundan aynı girdi + anahtar her zaman aynı Base64 çıktıyı üretir —
/// bu Metropol sözleşmesinin gereğidir, genel amaçlı şifreleme için kullanma.
/// VARSAYIM: Anahtar UTF-8 baytlarına çevrilir ve tam 16 bayt olmalıdır;
/// gerçek MetropolModels.cs sağlanınca anahtar kodlaması teyit edilecek.
/// </summary>
public static class AesEncryptionHelper
{
    private const int KeySizeBytes = 16;
    private const int BlockSizeBytes = 16;

    /// <summary>Düz metni AES CBC/PKCS7 (sıfır IV) ile şifreler ve Base64 döner.</summary>
    /// <exception cref="ArgumentException">Anahtar UTF-8 olarak 16 bayt değilse.</exception>
    public static string Encrypt(string plainText, string key)
    {
        using var aes = CreateAes(key);
        using var encryptor = aes.CreateEncryptor();

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        return Convert.ToBase64String(cipherBytes);
    }

    /// <summary>Base64 şifreli metni çözer ve UTF-8 düz metni döner (Encrypt'in tersi).</summary>
    /// <exception cref="ArgumentException">Anahtar UTF-8 olarak 16 bayt değilse.</exception>
    public static string Decrypt(string cipherTextBase64, string key)
    {
        using var aes = CreateAes(key);
        using var decryptor = aes.CreateDecryptor();

        var cipherBytes = Convert.FromBase64String(cipherTextBase64);
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plainBytes);
    }

    private static Aes CreateAes(string key)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        if (keyBytes.Length != KeySizeBytes)
        {
            // Anahtarın kendisi hata mesajına/log'a yazılmaz (CLAUDE.md kural 2).
            throw new ArgumentException(
                $"AES anahtarı UTF-8 olarak tam {KeySizeBytes} bayt olmalıdır.", nameof(key));
        }

        var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.BlockSize = BlockSizeBytes * 8; // 128 bit
        aes.Key = keyBytes;                 // 16 bayt → KeySize 128 bit
        aes.IV = new byte[BlockSizeBytes];  // Metropol sözleşmesi: IV = 16 baytlık sıfır dizisi
        return aes;
    }
}
