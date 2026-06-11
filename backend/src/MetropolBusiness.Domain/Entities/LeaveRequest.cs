using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// İzin talebi (ARCHITECTURE §4.6 leave_requests, PRD §10.1). Tenant'a aittir;
/// gün sayısı BACKEND'de hesaplanır (bitiş − başlangıç + 1, API_CONTRACT §11).
/// Onay tek aşamalıdır (PRD §17.6); karar veren/zaman/karar notu talebin üzerine yazılır.
/// </summary>
public class LeaveRequest : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    /// <summary>Talep eden kullanıcı.</summary>
    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>İzin tipi (annual/sick/unpaid... — serbest slug, modül seti genişleyebilir).</summary>
    public string Type { get; set; } = string.Empty;

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    /// <summary>Gün sayısı — backend hesaplar (bitiş − başlangıç + 1).</summary>
    public int Days { get; set; }

    public string? Note { get; set; }

    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    /// <summary>Kararı veren kullanıcı (onay/ret); pending'de null.</summary>
    public Guid? DecidedBy { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public string? DecisionNote { get; set; }
}
