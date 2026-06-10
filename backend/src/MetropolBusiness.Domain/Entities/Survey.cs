using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Domain.Interfaces;

namespace MetropolBusiness.Domain.Entities;

/// <summary>Firma anketi (ARCHITECTURE §4.3 surveys). Yalnızca kendi tenant'ında görünür.</summary>
public class Survey : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Title { get; set; } = string.Empty;

    public ContentStatus Status { get; set; } = ContentStatus.Draft;

    /// <summary>Tek seferlik mi — true ise ikinci yanıt SURVEY_ALREADY_ANSWERED (409) ile reddedilir.</summary>
    public bool SingleResponse { get; set; }

    public DateTimeOffset? PublishedAt { get; set; }

    public ICollection<SurveyQuestion> Questions { get; set; } = new List<SurveyQuestion>();
    public ICollection<SurveyResponse> Responses { get; set; } = new List<SurveyResponse>();
}
