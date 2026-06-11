namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kampanya kategorisi (ARCHITECTURE §4.4 campaign_categories, PANELS_SPEC B.7) —
/// Module gibi PLATFORM seviyesi tanımdır; tenant'a ait DEĞİLDİR, query filter'sızdır.
/// Platform admin tanımlar; kampanyalar bu kategorilere bağlanır, mobil Yan Haklar
/// grid'i bu listeden beslenir (PRD §7.1).
/// </summary>
public class CampaignCategory : BaseEntity
{
    /// <summary>Benzersiz slug: campaigns / social_responsibility / coupons ...</summary>
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Grid/liste sıralaması (PANELS_SPEC B.7 "sıra").</summary>
    public int SortOrder { get; set; }

    public ICollection<Campaign> Campaigns { get; set; } = new List<Campaign>();
}
