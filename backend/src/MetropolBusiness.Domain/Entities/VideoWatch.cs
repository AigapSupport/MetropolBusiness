namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kullanıcı bazlı video izleme durumu (ARCHITECTURE §4.3 video_watches).
/// UNIQUE(video_id, user_id) — kullanıcı başına tek kayıt, ilerleme upsert edilir.
/// Tenant izolasyonu ebeveyn Video üzerinden sağlanır.
/// </summary>
public class VideoWatch : BaseEntity
{
    public Guid VideoId { get; set; }
    public Video? Video { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>İzleme tamamlandı mı — true olduktan sonra geri alınmaz.</summary>
    public bool Watched { get; set; }

    public int ProgressSeconds { get; set; }

    public DateTimeOffset? WatchedAt { get; set; }
}
