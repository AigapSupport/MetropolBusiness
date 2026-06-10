using System.Text;
using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Infrastructure.Security;

/// <summary>
/// GEÇİCİ at-rest "şifreleme": "enc:" önekli Base64. GERÇEK ŞİFRELEME DEĞİLDİR —
/// yalnızca düz metnin DB'de okunur durmamasını ve IFieldCipher sözleşmesinin
/// (önek + çözülebilirlik) yerleşmesini sağlar.
/// TODO (Faz sonrası): ASP.NET DataProtection veya KMS tabanlı gerçek implementasyonla
/// değiştir; mevcut "enc:" kayıtları için geçiş (re-encrypt) script'i gerekir.
/// Çözülen değer hiçbir log'a yazılmaz (CLAUDE.md kural 4).
/// </summary>
public sealed class PlaceholderFieldCipher : IFieldCipher
{
    /// <summary>Önek, ileride gerçek şifreleme biçiminden ayırt etmeye yarar (sürüm işareti).</summary>
    private const string Prefix = "enc:";

    public string Encrypt(string plaintext) =>
        Prefix + Convert.ToBase64String(Encoding.UTF8.GetBytes(plaintext));

    public string? Decrypt(string? ciphertext)
    {
        if (string.IsNullOrEmpty(ciphertext) || !ciphertext.StartsWith(Prefix, StringComparison.Ordinal))
        {
            return null;
        }

        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(ciphertext[Prefix.Length..]));
        }
        catch (FormatException)
        {
            // Bozuk kayıt akışı kırmasın: çözülemeyen değer "yok" kabul edilir.
            return null;
        }
    }
}
