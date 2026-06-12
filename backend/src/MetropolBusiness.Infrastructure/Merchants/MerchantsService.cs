using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Merchants;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.Extensions.Caching.Distributed;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Infrastructure.Merchants;

/// <summary>
/// Keşfet (PRD §8.5, API_CONTRACT §9): MerchantList proxy'si. Liste büyük ve seyrek
/// değişir → IDistributedCache'te 6 saat tutulur (anahtar: sektör+listType+sürüm);
/// lastListVersionDate Metropol'e AYNEN geçer — artımlı güncellemeyi Metropol'ün kendi
/// sürümlemesi yapar (ARCHITECTURE §9 "uzun + sürüm"). Geri bildirim YEREL saklanır:
/// Metropol sözleşmesinde karşılığı yok (LESSONS.md).
/// </summary>
public sealed class MerchantsService(
    IMetropolApiClient metropolClient,
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IDistributedCache cache) : IMerchantsService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(6);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<Result<MerchantListDto>> GetMerchantsAsync(
        int sectorId, int listType, string? lastListVersionDate, CancellationToken ct = default)
    {
        // Merchant listesi tenant'a özgü değildir (Metropol platform verisi) — anahtar ortak.
        var cacheKey = $"merchants:{sectorId}:{listType}:{lastListVersionDate ?? "full"}";
        var cached = await cache.GetStringAsync(cacheKey, ct);
        if (!string.IsNullOrEmpty(cached))
        {
            var fromCache = JsonSerializer.Deserialize<MerchantListDto>(cached, JsonOptions);
            if (fromCache is not null)
            {
                return Result<MerchantListDto>.Ok(fromCache);
            }
        }

        var response = await metropolClient.MerchantListAsync(new MerchantListRequest
        {
            SectorId = sectorId,
            ListType = listType,
            LastChangeStateDate = lastListVersionDate ?? string.Empty,
        }, ct);

        if (response.ResponseCode != 0)
        {
            return Result<MerchantListDto>.Fail(new Error(
                ErrorCodes.MetropolError,
                MetropolErrorCatalog.GetMessage(response.ResponseCode), 422,
                new { providerCode = response.ResponseCode }));
        }

        var dto = new MerchantListDto(
            response.ListType,
            response.LastListVersionDate,
            (response.MerchantList ?? []).Select(m => new MerchantDto(
                m.MerchantCode, m.SignboardName, m.Sector, m.SubSector, m.City,
                m.District, m.SaleAddress, m.TelNo,
                // Metropol koordinatları TÜRKÇE biçimde döner ("41,0619...") — istemci
                // Number() ile parse edemiyor (NaN → haritada pin yok, 2026-06-12).
                // Nokta ondalıklı normalize edilir.
                NormalizeCoordinate(m.Lat), NormalizeCoordinate(m.Lng),
                m.ActiveFlag, m.CampaignCode)).ToList());

        await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dto, JsonOptions),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CacheTtl }, ct);

        return Result<MerchantListDto>.Ok(dto);
    }

    /// <summary>Türkçe ondalık virgülünü noktaya çevirir ("41,06" → "41.06"); boş değer boş kalır.</summary>
    private static string NormalizeCoordinate(string? value) =>
        value?.Replace(',', '.') ?? string.Empty;

    public async Task<Result<bool>> SubmitFeedbackAsync(
        string merchantCode, MerchantFeedbackRequestDto request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return Result<bool>.Fail(new Error(
                ErrorCodes.ValidationError, "Mesaj zorunludur.", 400, new { field = "message" }));
        }

        dbContext.MerchantFeedbacks.Add(new MerchantFeedback
        {
            UserId = tenantContext.UserId
                ?? throw new InvalidOperationException("Kullanıcı bağlamı yok."),
            MerchantCode = merchantCode.Trim(),
            Message = request.Message.Trim(),
        });
        await dbContext.SaveChangesAsync(ct);

        return Result<bool>.Ok(true);
    }
}
