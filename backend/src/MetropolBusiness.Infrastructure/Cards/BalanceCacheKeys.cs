namespace MetropolBusiness.Infrastructure.Cards;

/// <summary>
/// Bakiye cache anahtarı tek yerden üretilir: BalanceService yazar/okur,
/// harcama/transfer servisleri (Faz 1.6–1.7) para hareketi sonrası GEÇERSİZ KILAR
/// (balanceAfter sözleşmeden kaldırıldı; güncel bakiye ayrı uçtan alınır).
/// Anahtar cardId bazlıdır; kart sahipliği zaten tenant+kullanıcı filtreli doğrulanır.
/// </summary>
internal static class BalanceCacheKeys
{
    /// <summary>Kartın tüm cüzdan bakiyelerini tutan cache anahtarı.</summary>
    public static string ForCard(Guid cardId) => $"balance:{cardId}";
}
