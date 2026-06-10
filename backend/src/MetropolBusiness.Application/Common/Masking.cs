namespace MetropolBusiness.Application.Common;

/// <summary>
/// PII maskeleme yardımcıları (CLAUDE.md kural 4, ARCHITECTURE §5.4).
/// Maskeleme backend'de yapılır; istemciye maskesiz kart no / isim / TCKN / telefon gitmez.
/// Boş girdi boş döner; açık karakter bırakacak kadar uzun olmayan girdinin TAMAMI yıldızlanır
/// (güvenli varsayılan — kısa değer asla kısmen açık gösterilmez).
/// </summary>
public static class Masking
{
    private const char Star = '*';

    /// <summary>
    /// Kart no: ilk 3 + sabit 6 yıldız + son 3 → "637******976" (API_CONTRACT §4).
    /// Yıldız sayısı sabittir; kartın gerçek uzunluğu da gizlenir.
    /// </summary>
    public static string MaskCardNo(string? cardNo)
    {
        if (string.IsNullOrEmpty(cardNo))
        {
            return string.Empty;
        }

        if (cardNo.Length <= 6)
        {
            return new string(Star, cardNo.Length);
        }

        return string.Concat(cardNo.AsSpan(0, 3), new string(Star, 6), cardNo.AsSpan(cardNo.Length - 3));
    }

    /// <summary>
    /// İsim: her kelimenin ilk 2 harfi açık kalır; kalanı yıldızlanır →
    /// "Ali Tekin" → "Al*** Te**" (API_CONTRACT §5 örneği). Yıldız sayısı sabittir
    /// (ilk kelime 3, sonrakiler 2) — kelimenin gerçek uzunluğu da gizlenir.
    /// 2 harf ve altı kelimelerin tamamı yıldızlanır.
    /// </summary>
    public static string MaskName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            return string.Empty;
        }

        var words = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var maskedWords = new string[words.Length];
        for (var i = 0; i < words.Length; i++)
        {
            var word = words[i];
            if (word.Length <= 2)
            {
                maskedWords[i] = new string(Star, word.Length);
                continue;
            }

            var starCount = i == 0 ? 3 : 2;
            maskedWords[i] = string.Concat(word.AsSpan(0, 2), new string(Star, starCount));
        }

        return string.Join(' ', maskedWords);
    }

    /// <summary>TCKN: ilk 2 + orta yıldız + son 2 → "11*******11" (11 hanede 7 yıldız, API_CONTRACT §2).</summary>
    public static string MaskTckn(string? tckn)
    {
        if (string.IsNullOrEmpty(tckn))
        {
            return string.Empty;
        }

        if (tckn.Length <= 4)
        {
            return new string(Star, tckn.Length);
        }

        return string.Concat(tckn.AsSpan(0, 2), new string(Star, tckn.Length - 4), tckn.AsSpan(tckn.Length - 2));
    }

    /// <summary>Telefon: ilk 3 + orta yıldız + son 2 → "534*****39" (10 hanede 5 yıldız).</summary>
    public static string MaskPhone(string? phone)
    {
        if (string.IsNullOrEmpty(phone))
        {
            return string.Empty;
        }

        if (phone.Length <= 5)
        {
            return new string(Star, phone.Length);
        }

        return string.Concat(phone.AsSpan(0, 3), new string(Star, phone.Length - 5), phone.AsSpan(phone.Length - 2));
    }
}
