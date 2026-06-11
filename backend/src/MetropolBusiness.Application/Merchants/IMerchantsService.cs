using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Merchants;

/// <summary>docs/API_CONTRACT.md §9 — üye işyeri listesi (lat/lng Metropol'den string gelir, aynen geçer).</summary>
public sealed record MerchantDto(
    string MerchantCode, string SignboardName, string Sector, string SubSector,
    string City, string District, string SaleAddress, string TelNo,
    string Lat, string Lng, int ActiveFlag, int CampaignCode);

public sealed record MerchantListDto(
    int ListType, string? LastListVersionDate, IReadOnlyList<MerchantDto> Items);

public sealed record MerchantFeedbackRequestDto(string Message);

/// <summary>
/// Keşfet (PRD §8.5): MerchantList proxy + uzun cache (liste büyük ve seyrek değişir;
/// Metropol kendi sürümlemesini lastListVersionDate ile yapar — parametre aynen geçer).
/// Geri bildirim YEREL saklanır: Metropol sözleşmesinde karşılığı yok (LESSONS.md).
/// </summary>
public interface IMerchantsService
{
    Task<Result<MerchantListDto>> GetMerchantsAsync(
        int sectorId, int listType, string? lastListVersionDate, CancellationToken ct = default);

    Task<Result<bool>> SubmitFeedbackAsync(
        string merchantCode, MerchantFeedbackRequestDto request, CancellationToken ct = default);
}
