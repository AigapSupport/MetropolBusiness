namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Platform seviyesi modül tanımı (ARCHITECTURE §4.1 modules) — tenant'a ait DEĞİLDİR;
/// platform admin tanımlar, firmalara açılır, segmentlere atanır (PANELS_SPEC §C zinciri).
/// </summary>
public class Module : BaseEntity
{
    /// <summary>Benzersiz slug: leave_request / expense_request / expense_approval ...</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<SegmentModule> SegmentModules { get; set; } = new List<SegmentModule>();
}
