using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Masraf talebi (ARCHITECTURE §4.6 expense_requests, PRD §10.1). Tenant'a aittir;
/// tutar para olduğundan decimal'dir — DB'de numeric(18,2), API'de string (CLAUDE.md kural 5).
/// Onay tek aşamalıdır (PRD §17.6); karar veren/zaman/karar notu talebin üzerine yazılır.
/// </summary>
public class ExpenseRequest : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    /// <summary>Talep eden kullanıcı.</summary>
    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Masraf tipi (travel/meal/office... — serbest slug).</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Masraf tutarı — DB'de numeric(18,2), API'de string "1500.00".</summary>
    public decimal Amount { get; set; }

    /// <summary>Masrafın yapıldığı tarih.</summary>
    public DateOnly Date { get; set; }

    /// <summary>Fiş/foto eki (URL — dosya yükleme altyapısı ayrı iş).</summary>
    public string? ReceiptUrl { get; set; }

    public string? Note { get; set; }

    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    /// <summary>Kararı veren kullanıcı (onay/ret); pending'de null.</summary>
    public Guid? DecidedBy { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public string? DecisionNote { get; set; }
}
