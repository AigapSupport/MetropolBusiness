using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>Firma içi kullanıcı grubu; modül yetkileri segment bazında verilir (CLAUDE.md §13).</summary>
public class Segment : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Name { get; set; } = string.Empty;

    public ICollection<UserSegment> UserSegments { get; set; } = new List<UserSegment>();
    public ICollection<SegmentModule> SegmentModules { get; set; } = new List<SegmentModule>();
}
