using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Üye işyeri geri bildirimi (API_CONTRACT §9, PRD §8.5 "Geri Bildirim Gönder").
/// Metropol sözleşmesinde geri bildirim ucu YOKTUR (MetropolModels.cs/ApiEndpoints'te
/// karşılığı yok) — bu yüzden YEREL saklanır; Metropol tarafı uç sağlarsa iletim
/// sonraki fazda eklenir (LESSONS.md notu). Tenant'a aittir; mesaj serbest metindir,
/// PII içermemesi beklenir ve log'lanmaz.
/// </summary>
public class MerchantFeedback : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    /// <summary>Geri bildirimi gönderen kullanıcı.</summary>
    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Metropol MerchantCode (örn. "0000000005") — yerel FK yok, kod saklanır.</summary>
    public string MerchantCode { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}
