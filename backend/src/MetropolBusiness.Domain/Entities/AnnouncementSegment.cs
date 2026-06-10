namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Duyuru ↔ segment hedefleme n-n bağı (PK: AnnouncementId+SegmentId).
/// Duyurunun hiç segment bağı yoksa tenant'taki tüm kullanıcılara görünür.
/// </summary>
public class AnnouncementSegment
{
    public Guid AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }

    public Guid SegmentId { get; set; }
    public Segment? Segment { get; set; }
}
