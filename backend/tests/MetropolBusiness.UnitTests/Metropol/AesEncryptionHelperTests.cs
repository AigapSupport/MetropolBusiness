using MetropolBusiness.Integration.Metropol.Crypto;

namespace MetropolBusiness.UnitTests.Metropol;

/// <summary>
/// Metropol AES yardımcısı (CLAUDE.md §6 / §10: AES token üretimi test zorunlu):
/// roundtrip, determinizm (IV sıfır dizisi), bilinen vektör, geçersiz anahtar uzunluğu.
/// </summary>
public class AesEncryptionHelperTests
{
    /// <summary>UTF-8 olarak tam 16 bayt — Metropol 128-bit anahtar sözleşmesi.</summary>
    private const string ValidKey = "0123456789abcdef";

    [Fact]
    public void Encrypt_then_decrypt_roundtrips_plaintext()
    {
        const string plainText = """{"AccessKey":"abc-123","CreateDate":"2026-06-10T13:19:00"}""";

        var cipher = AesEncryptionHelper.Encrypt(plainText, ValidKey);
        var decrypted = AesEncryptionHelper.Decrypt(cipher, ValidKey);

        Assert.Equal(plainText, decrypted);
    }

    [Fact]
    public void Roundtrip_preserves_turkish_characters()
    {
        const string plainText = "şifreli içerik — ĞÜŞİÖÇ ğüşıöç";

        var decrypted = AesEncryptionHelper.Decrypt(
            AesEncryptionHelper.Encrypt(plainText, ValidKey), ValidKey);

        Assert.Equal(plainText, decrypted);
    }

    [Fact]
    public void Same_input_produces_same_output()
    {
        const string plainText = "deterministik-girdi";

        var first = AesEncryptionHelper.Encrypt(plainText, ValidKey);
        var second = AesEncryptionHelper.Encrypt(plainText, ValidKey);

        // IV sabit (16 baytlık sıfır dizisi) olduğundan çıktı her çağrıda birebir aynıdır.
        Assert.Equal(first, second);
    }

    [Fact]
    public void Known_vector_produces_expected_base64()
    {
        // Bağımsız hesaplanmış vektör (AES-128-CBC, PKCS7, IV=0x00..00, anahtar UTF-8):
        // determinizm + Base64 çıktının dış dünyayla uyumunu sabitler.
        var cipher = AesEncryptionHelper.Encrypt("metropol-test-verisi", ValidKey);

        Assert.Equal("zRTn4cmx+JnTNVOFgJv7npyHJtYozdG1oDWDAHxqphw=", cipher);
    }

    [Theory]
    [InlineData("")]                      // boş
    [InlineData("kisa")]                  // 4 bayt
    [InlineData("0123456789abcde")]       // 15 bayt
    [InlineData("0123456789abcdefg")]     // 17 bayt
    [InlineData("0123456789abcdeş")]      // 16 karakter ama UTF-8'de 17 bayt
    public void Encrypt_with_non_16_byte_key_throws_argument_exception(string invalidKey)
    {
        Assert.Throws<ArgumentException>(() => AesEncryptionHelper.Encrypt("veri", invalidKey));
    }

    [Fact]
    public void Decrypt_with_non_16_byte_key_throws_argument_exception()
    {
        var cipher = AesEncryptionHelper.Encrypt("veri", ValidKey);

        Assert.Throws<ArgumentException>(() => AesEncryptionHelper.Decrypt(cipher, "kisa-anahtar"));
    }
}
