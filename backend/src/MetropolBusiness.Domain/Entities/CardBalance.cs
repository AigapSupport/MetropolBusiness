using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kartın cüzdan bazlı SON BİLİNEN bakiye snapshot'ı (KARAR 2026-06-11, ARCHITECTURE §4.2):
/// Metropol kaynak-otorite kalır; bu tablo son başarılı BalanceQuery yanıtının kopyasını
/// tutar (kesinti dayanıklılığı — Metropol erişilemezse son bilinen değer stale bayrağıyla
/// döner). UpdatedAt = son başarılı senkron zamanı (yanıttaki asOf). İşlem verisi
/// saklanMAYA devam eder; yalnızca bakiye snapshot'ı tutulur.
/// </summary>
public class CardBalance : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid CardId { get; set; }
    public Card? Card { get; set; }

    /// <summary>Metropol cüzdan kimliği (1 = Resto, 3 = Gift — CLAUDE.md §13).</summary>
    public int WalletId { get; set; }

    public string? WalletName { get; set; }

    /// <summary>Son bilinen bakiye — para decimal (CLAUDE.md kural 5), DB numeric(18,2).</summary>
    public decimal Balance { get; set; }
}
