namespace MetropolBusiness.Domain.Enums;

/// <summary>Firma durumu: active/passive/pending (ARCHITECTURE §4.1 tenants.status).</summary>
public enum TenantStatus
{
    Pending,
    Active,
    Passive,
}
