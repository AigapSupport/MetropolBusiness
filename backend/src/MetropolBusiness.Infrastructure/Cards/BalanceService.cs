using System.Globalization;
using System.Text.Json;
using MetropolBusiness.Application.Cards;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Infrastructure.Cards;

/// <summary>
/// Bakiye & işlem servisi (TODO 1.5 backend, API_CONTRACT §6). İşlem verisi DB'de
/// SAKLANMAZ — Metropol'den canlı çekilir. Bakiye ~30 sn IDistributedCache ile
/// cache'lenir, forceRefresh atlar (PRD §17.7 "canlı + kısa cache + manuel yenileme").
/// KARAR 2026-06-11: başarılı her BalanceQuery yanıtı card_balances'a UPSERT edilir
/// (Metropol kaynak-otorite, DB son-bilinen kopya); Metropol ERİŞİLEMEZSE (exception)
/// snapshot varsa stale=true + asOf=son senkron ile döner, iş kuralı hataları
/// (ResponseCode != 0) eskisi gibi 422 METROPOL_ERROR kalır.
/// Çözülen UserAccountToken yalnızca Metropol isteğinde kullanılır; LOG'LANMAZ.
/// </summary>
public sealed class BalanceService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IFieldCipher fieldCipher,
    IMetropolApiClient metropolApiClient,
    IDistributedCache cache,
    ILogger<BalanceService> logger) : IBalanceService
{
    /// <summary>Bakiye cache süresi (PRD §17.7: ~30 sn — para verisinde tazelik önceliği).</summary>
    private static readonly TimeSpan BalanceCacheTtl = TimeSpan.FromSeconds(30);

    private static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);

    private static readonly Error CardNotFoundError = new(
        ErrorCodes.NotFound, "Kart bulunamadı.", 404);

    /// <summary>
    /// TransactionDate için denenen bilinen biçimler (sözleşmede biçim belgesiz —
    /// en iyi çaba parse, LESSONS.md "Belgesiz Metropol semantikleri").
    /// </summary>
    private static readonly string[] KnownDateFormats =
    [
        "yyyy-MM-ddTHH:mm:ss",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-ddTHH:mm:ssZ",
        "dd.MM.yyyy HH:mm:ss",
        "dd.MM.yyyy HH:mm",
        "dd/MM/yyyy HH:mm:ss",
    ];

    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException(
            "Kullanıcı bağlamı yok: bu işlem oturum açmış kullanıcı gerektirir.");

    public async Task<Result<BalanceResponse>> GetBalanceAsync(
        Guid cardId, int? walletId, bool forceRefresh, CancellationToken cancellationToken = default)
    {
        var tokenResult = await ResolveCardTokenAsync(cardId, cancellationToken);
        BalanceResponse? full = null;

        if (!tokenResult.IsSuccess)
        {
            // Kart-yok (404) aynen döner. Token ÇÖZÜLEMİYORSA (anahtar rotasyonu/bozuk
            // kayıt) bakiye için erişilemezlikle aynı muamele: snapshot varsa stale=true
            // döner, yoksa orijinal hata korunur — 500 yerine son bilinen değer.
            if (tokenResult.Error!.Code != ErrorCodes.InternalError)
            {
                return Result<BalanceResponse>.Fail(tokenResult.Error!);
            }

            full = await TryLoadSnapshotAsync(cardId, cancellationToken);
            if (full is null)
            {
                return Result<BalanceResponse>.Fail(tokenResult.Error!);
            }

            // PII'siz log: token/kart verisi yazılmaz, yalnız id.
            logger.LogWarning(
                "Kart token'ı çözülemedi; son bilinen snapshot stale=true döndü. CardId={CardId}",
                cardId);
        }

        // Cache her zaman TÜM cüzdanları tutar (anahtar BalanceCacheKeys.ForCard); walletId
        // filtresi bellekte uygulanır — böylece cüzdan bazlı istekler ayrı cache şişirmez.
        // Harcama/transfer servisleri para hareketi sonrası bu anahtarı geçersiz kılar.
        var cacheKey = BalanceCacheKeys.ForCard(cardId);

        if (full is null && !forceRefresh)
        {
            var cached = await cache.GetStringAsync(cacheKey, cancellationToken);
            if (cached is not null)
            {
                full = JsonSerializer.Deserialize<BalanceResponse>(cached, JsonWeb);
            }
        }

        if (full is null)
        {
            var freshResult = await FetchFreshBalanceAsync(
                cardId, tokenResult.Value, cacheKey, cancellationToken);
            if (!freshResult.IsSuccess)
            {
                return Result<BalanceResponse>.Fail(freshResult.Error!);
            }

            full = freshResult.Value;
        }

        if (walletId is null)
        {
            return Result<BalanceResponse>.Ok(full);
        }

        // Cüzdan filtresi: totalBalance dönen (filtrelenmiş) cüzdanların toplamıdır;
        // asOf/stale tüm cüzdanlar için aynı senkrona ait olduğundan aynen taşınır.
        var filtered = full.Wallets.Where(w => w.WalletId == walletId.Value).ToList();
        var filteredTotal = filtered.Sum(w => decimal.Parse(w.Balance, CultureInfo.InvariantCulture));
        return Result<BalanceResponse>.Ok(
            new BalanceResponse(filtered, FormatMoney(filteredTotal), full.AsOf, full.Stale));
    }

    /// <summary>
    /// Metropol'den taze bakiye çeker (KARAR 2026-06-11 akışı):
    /// BAŞARILI yanıt → card_balances'a upsert + cache + asOf=şimdi, stale=false.
    /// ERİŞİLEMEZLİK (exception) → snapshot varsa son bilinen değerler stale=true +
    /// asOf=son senkron ile döner (PROVIDER_UNAVAILABLE yutulur, PII'siz warning log);
    /// snapshot yoksa eski davranış korunur (exception yukarı fırlar).
    /// İŞ KURALI hatası (ResponseCode != 0) → eskisi gibi 422 METROPOL_ERROR (snapshot'a düşülmez).
    /// </summary>
    private async Task<Result<BalanceResponse>> FetchFreshBalanceAsync(
        Guid cardId, string userAccountToken, string cacheKey, CancellationToken cancellationToken)
    {
        BalanceQueryResponse response;
        try
        {
            // VARSAYIM (belgesiz semantik, LESSONS.md): UserRefNo = çözülmüş UserAccountToken,
            // UserRefType = 2 (token), WalletId = 0 → tüm cüzdanlar (MetropolDefaults sabitleri).
            response = await metropolApiClient.BalanceQueryAsync(
                new BalanceQueryRequest
                {
                    UserRefType = MetropolDefaults.TokenUserRefType,
                    UserRefNo = userAccountToken,
                    WalletId = MetropolDefaults.AllWalletsId,
                },
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            var snapshot = await TryLoadSnapshotAsync(cardId, cancellationToken);
            if (snapshot is null)
            {
                // Snapshot yokken eski davranış: erişilemezlik yutulMAZ, yukarı fırlar.
                throw;
            }

            // PII'siz log: kart token'ı/kullanıcı verisi YAZILMAZ, yalnız id + istisna türü.
            logger.LogWarning(
                ex,
                "Metropol bakiye sorgusuna erişilemedi; son bilinen snapshot stale=true döndü. CardId={CardId}",
                cardId);
            return Result<BalanceResponse>.Ok(snapshot);
        }

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<BalanceResponse>.Fail(MetropolError(response.ResponseCode));
        }

        var balances = response.UserBalance ?? [];
        var asOf = await UpsertSnapshotAsync(cardId, balances, cancellationToken);

        var wallets = balances
            .Select(w => new WalletBalanceDto(w.WalletId, w.WalletName, FormatMoney(w.Balance)))
            .ToList();
        var full = new BalanceResponse(
            wallets, FormatMoney(balances.Sum(w => w.Balance)), asOf, Stale: false);

        await cache.SetStringAsync(
            cacheKey,
            JsonSerializer.Serialize(full, JsonWeb),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = BalanceCacheTtl },
            cancellationToken);

        return Result<BalanceResponse>.Ok(full);
    }

    /// <summary>
    /// Başarılı BalanceQuery yanıtını card_balances'a UPSERT eder (KARAR 2026-06-11):
    /// kartın mevcut cüzdan satırları güncellenir, yeni cüzdanlar eklenir, yanıtta artık
    /// olmayan cüzdan satırları silinir (snapshot = son bilinen TAM durum). Döner: senkron
    /// zamanı (asOf) — UpdatedAt değerleri SaveChanges'te aynı ana ayarlanır.
    /// </summary>
    private async Task<DateTimeOffset> UpsertSnapshotAsync(
        Guid cardId, List<UserBalance> balances, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        // Query filter (Card üzerinden tenant) açık kalır; sahiplik zaten doğrulandı.
        var existing = await dbContext.CardBalances
            .Where(cb => cb.CardId == cardId)
            .ToListAsync(cancellationToken);

        foreach (var wallet in balances)
        {
            var row = existing.FirstOrDefault(cb => cb.WalletId == wallet.WalletId);
            if (row is null)
            {
                // TenantId, SaveChanges'te istek bağlamından otomatik atanır (ITenantOwned).
                dbContext.CardBalances.Add(new CardBalance
                {
                    CardId = cardId,
                    WalletId = wallet.WalletId,
                    WalletName = wallet.WalletName,
                    Balance = wallet.Balance,
                });
            }
            else
            {
                row.WalletName = wallet.WalletName;
                row.Balance = wallet.Balance;
                // Değer değişmese de senkron zamanı ilerlemeli (asOf doğruluğu):
                // UpdatedAt'e dokunmak satırı Modified yapar; SaveChanges şimdiye çeker.
                row.UpdatedAt = now;
            }
        }

        dbContext.CardBalances.RemoveRange(
            existing.Where(cb => balances.All(w => w.WalletId != cb.WalletId)));

        await dbContext.SaveChangesAsync(cancellationToken);
        return now;
    }

    /// <summary>
    /// Son bilinen bakiye snapshot'ını okur (Metropol erişilemezlik yedeği). Satır yoksa
    /// null döner. asOf = satırların son UpdatedAt'i (son başarılı senkron), stale = true.
    /// </summary>
    private async Task<BalanceResponse?> TryLoadSnapshotAsync(
        Guid cardId, CancellationToken cancellationToken)
    {
        var rows = await dbContext.CardBalances
            .AsNoTracking()
            .Where(cb => cb.CardId == cardId)
            .OrderBy(cb => cb.WalletId)
            .ToListAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return null;
        }

        var wallets = rows
            .Select(r => new WalletBalanceDto(r.WalletId, r.WalletName, FormatMoney(r.Balance)))
            .ToList();
        return new BalanceResponse(
            wallets,
            FormatMoney(rows.Sum(r => r.Balance)),
            rows.Max(r => r.UpdatedAt),
            Stale: true);
    }

    public async Task<Result<PagedResponse<TransactionItemDto>>> GetTransactionsAsync(
        Guid cardId, int page, int pageSize, DateTimeOffset? startDate, DateTimeOffset? endDate,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            page = 1;
        }

        pageSize = pageSize switch
        {
            < 1 => 20,
            > 100 => 100,
            _ => pageSize,
        };

        var tokenResult = await ResolveCardTokenAsync(cardId, cancellationToken);
        if (!tokenResult.IsSuccess)
        {
            return Result<PagedResponse<TransactionItemDto>>.Fail(tokenResult.Error!);
        }

        var response = await metropolApiClient.TransactionHistoryAsync(
            new TransactionHistoryRequest { UserAccountRef = tokenResult.Value },
            cancellationToken);

        if (!MetropolErrorCatalog.IsSuccess(response.ResponseCode))
        {
            return Result<PagedResponse<TransactionItemDto>>.Fail(MetropolError(response.ResponseCode));
        }

        var mapped = (response.PaymentInfo ?? [])
            .Select(item =>
            {
                var (isoDate, parsedDate) = ParseTransactionDate(item.TransactionDate);
                return (Dto: MapTransaction(item, isoDate), ParsedDate: parsedDate);
            })
            // Tarih filtresi parse edilebilen kayıtlara uygulanır; parse EDİLEMEYEN kayıt
            // güvenli tarafta listede TUTULUR (veri kaybetmek yerine göstermek tercih edilir).
            .Where(x => x.ParsedDate is null
                || ((startDate is null || x.ParsedDate >= startDate)
                    && (endDate is null || x.ParsedDate <= endDate)))
            // En yeni işlem önce; tarihi çözülemeyenler listenin sonunda.
            .OrderByDescending(x => x.ParsedDate ?? DateTimeOffset.MinValue)
            .Select(x => x.Dto)
            .ToList();

        // TransactionHistory sözleşmesi SAYFASIZ döner (istekte sayfa parametresi yok);
        // bizim sözleşme §0.4 sayfalı zarf ister → bellekte sayfalanır.
        var items = mapped
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Result<PagedResponse<TransactionItemDto>>.Ok(
            new PagedResponse<TransactionItemDto>(items, page, pageSize, mapped.Count));
    }

    public async Task<Result<ItemsResponse<TransactionItemDto>>> GetRecentAsync(
        Guid cardId, CancellationToken cancellationToken = default)
    {
        // Son 5 işlem = işlem listesinin ilk sayfası (en yeni önce sıralı), pageSize=5.
        var result = await GetTransactionsAsync(cardId, page: 1, pageSize: 5, null, null, cancellationToken);
        return result.IsSuccess
            ? Result<ItemsResponse<TransactionItemDto>>.Ok(new ItemsResponse<TransactionItemDto>(result.Value.Items))
            : Result<ItemsResponse<TransactionItemDto>>.Fail(result.Error!);
    }

    /// <summary>
    /// Kart sahipliğini doğrular (tenant query filter + kullanıcı koşulu) ve token'ı çözer.
    /// Başka kullanıcının/tenant'ın kartı NOT_FOUND döner — Metropol'e hiç gidilmez.
    /// </summary>
    private async Task<Result<string>> ResolveCardTokenAsync(Guid cardId, CancellationToken cancellationToken)
    {
        var userId = RequiredUserId;
        var card = await dbContext.Cards
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == cardId && c.UserId == userId, cancellationToken);
        if (card is null)
        {
            return Result<string>.Fail(CardNotFoundError);
        }

        var token = fieldCipher.Decrypt(card.UserAccountTokenEncrypted);
        return token is null
            ? Result<string>.Fail(new Error(ErrorCodes.InternalError, "Kart kaydı doğrulanamadı.", 500))
            : Result<string>.Ok(token);
    }

    private static TransactionItemDto MapTransaction(TransactionHistoryItem item, string isoDate)
    {
        var type = MetropolDefaults.MapTranType(item.TranTypeId);

        // Tutar İŞARETLİ string (API_CONTRACT §6 "-300.00"). VARSAYIM (LESSONS.md):
        // satış harcamadır → her zaman eksi; transfer benzeri hareketlerde Metropol'ün
        // işareti korunur (yön bilgisi belgesiz).
        var amount = type == "sale" ? -Math.Abs(item.Amount) : item.Amount;

        return new TransactionItemDto(
            item.TransactionId,
            type,
            // walletName sunumda cüzdan/ürün adıdır (RESTOPAY/GIFTPAY) → ProductName.
            string.IsNullOrWhiteSpace(item.ProductName) ? null : item.ProductName,
            // title karşı taraf/şube başlığıdır; TransactionInfo kişi adı içerebileceği
            // için title olarak YALNIZCA BranchName kullanılır (maskesiz PII sızmaz).
            string.IsNullOrWhiteSpace(item.BranchName) ? null : item.BranchName,
            // Maskeleme backend'de: TransactionInfo'daki ad makul biçimde kelime kelime
            // maskelenir (Masking.MaskName) — istemciye maskesiz isim gitmez.
            Masking.MaskName(item.TransactionInfo),
            item.TransactionId.ToString(CultureInfo.InvariantCulture),
            FormatMoney(amount),
            isoDate);
    }

    /// <summary>
    /// TransactionDate'i en iyi çaba ile ISO-8601'e çevirir (biçim belgesiz, LESSONS.md):
    /// önce InvariantCulture, sonra bilinen biçimler, sonra tr-TR denenir. Hiçbiri
    /// tutmazsa kayıt ATLANMAZ ve alan boş bırakılmaz — ham değer olduğu gibi döner
    /// (istemci ham stringi gösterebilir; sessiz veri kaybı yerine görünür değer).
    /// </summary>
    private static (string Iso, DateTimeOffset? Parsed) ParseTransactionDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return (string.Empty, null);
        }

        // Saat dilimi belgesiz: UTC varsayılır (AssumeUniversal) — yanıttaki "Z" soneki
        // bu varsayımı görünür kılar; Metropol testinde teyit edilecek.
        if (DateTimeOffset.TryParse(
                raw, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)
            || DateTimeOffset.TryParseExact(
                raw, KnownDateFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out parsed)
            || DateTimeOffset.TryParse(
                raw, CultureInfo.GetCultureInfo("tr-TR"),
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out parsed))
        {
            return (parsed.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture), parsed);
        }

        return (raw, null);
    }

    /// <summary>Para bizim sözleşmede string'tir: decimal → "500.00" (InvariantCulture).</summary>
    private static string FormatMoney(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);

    private static Error MetropolError(int responseCode) => new(
        ErrorCodes.MetropolError,
        MetropolErrorCatalog.GetMessage(responseCode),
        422,
        new { providerCode = responseCode });
}
