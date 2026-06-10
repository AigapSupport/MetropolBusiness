using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Çift harcama/transfer engeli kaydı (ARCHITECTURE §4.2 payment_idempotency, §5.3).
/// İstemcinin Idempotency-Key başlığı tenant içinde benzersizdir (UNIQUE(tenant_id, idempotency_key));
/// para uçları (SaleConfirm/BalanceTransfer, Faz 1.6–1.7) bu tabloyla korunur.
/// </summary>
public class PaymentIdempotency : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>İstemcinin gönderdiği Idempotency-Key (tenant içinde benzersiz).</summary>
    public string IdempotencyKey { get; set; } = string.Empty;

    /// <summary>İşlem türü: sale_confirm / balance_transfer (ARCHITECTURE §4.2 sözlüğü).</summary>
    public string Operation { get; set; } = string.Empty;

    /// <summary>Metropol referansı: SaleRefCode/ConsumerRefCode — aynı kod tekrar gönderilmez.</summary>
    public string? RefCode { get; set; }

    /// <summary>İşlem durumu: pending / success / failed (ARCHITECTURE §5.3 akışı).</summary>
    public string Status { get; set; } = "pending";

    /// <summary>Başarılı yanıtın anlık görüntüsü (jsonb) — tekrar istek geldiğinde bu döner.</summary>
    public string? ResponseSnapshotJson { get; set; }
}
