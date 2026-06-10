namespace MetropolBusiness.Domain.Entities;

/// <summary>Kullanıcı ↔ segment n-n bağı (PK: UserId+SegmentId).</summary>
public class UserSegment
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid SegmentId { get; set; }
    public Segment? Segment { get; set; }
}
