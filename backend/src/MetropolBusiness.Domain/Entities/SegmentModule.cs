namespace MetropolBusiness.Domain.Entities;

/// <summary>Segment → modül yetkisi (PK: SegmentId+ModuleId).</summary>
public class SegmentModule
{
    public Guid SegmentId { get; set; }
    public Segment? Segment { get; set; }

    public Guid ModuleId { get; set; }
    public Module? Module { get; set; }
}
