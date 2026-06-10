using System.Globalization;
using System.Security.Cryptography;
using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Infrastructure.Security;

/// <summary>
/// PBKDF2 (SHA256, 100k iterasyon, 16B salt, 32B hash) şifre hash'leme — panel girişi
/// (TODO 1.9, PANELS_SPEC §0.4 kararı). ASP.NET Identity paketi BİLİNÇLİ kullanılmadı
/// (ek paket bağımlılığı); .NET yerleşik Rfc2898DeriveBytes.Pbkdf2 yeterlidir.
/// Biçim: "pbkdf2$&lt;iter&gt;$&lt;saltB64&gt;$&lt;hashB64&gt;" — iterasyon kayıtla saklanır,
/// ileride artarsa eski kayıtlar kendi değeriyle doğrulanmaya devam eder.
/// Düz şifre ve hash hiçbir log'a yazılmaz (CLAUDE.md kural 4).
/// </summary>
public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const string Prefix = "pbkdf2";
    private const int Iterations = 100_000;
    private const int SaltSizeBytes = 16;
    private const int HashSizeBytes = 32;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSizeBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, Iterations, HashAlgorithmName.SHA256, HashSizeBytes);

        return string.Create(CultureInfo.InvariantCulture,
            $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}");
    }

    public bool Verify(string password, string passwordHash)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(passwordHash))
        {
            return false;
        }

        // Biçim: pbkdf2$<iter>$<saltB64>$<hashB64> — tanınmayan biçimde false dönülür
        // (exception ile akış kontrolü yok, CLAUDE.md §7).
        var parts = passwordHash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix)
        {
            return false;
        }

        if (!int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var iterations)
            || iterations < 1)
        {
            return false;
        }

        byte[] salt;
        byte[] expected;
        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expected = Convert.FromBase64String(parts[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        var actual = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);

        // Sabit-zaman karşılaştırma: erken çıkışlı == timing bilgisi sızdırır.
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
