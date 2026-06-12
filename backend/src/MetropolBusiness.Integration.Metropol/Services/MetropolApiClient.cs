using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// IMetropolApiClient HTTP implementasyonu. Her çağrıda MetropolTokenService'ten
/// geçerli Bearer token alınır (cache'li). İstek/yanıt gövdeleri ve kart no/TCKN
/// LOG'LANMAZ (CLAUDE.md kural 4) — yalnız İŞ HATALARINDA uç + ResponseCode +
/// sağlayıcının jenerik ResponseMessage'ı loglanır (istek PII'si içermez; belgesiz
/// kodların — 9001/90000 vb. — anlamını teşhis için tek kaynak budur).
/// Retry YOK: para uçlarında (SaleConfirm, BalanceTransfer) çift işlem riski
/// nedeniyle yeniden deneme uygulama katmanında idempotency ile yönetilir
/// (CLAUDE.md §6, ARCHITECTURE §5.2).
/// </summary>
public sealed class MetropolApiClient(
    HttpClient httpClient,
    MetropolTokenService tokenService,
    ILogger<MetropolApiClient> logger)
    : IMetropolApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public Task<AddAccountResponse> AddAccountAsync(AddAccountRequest request, CancellationToken ct = default) =>
        PostAsync<AddAccountRequest, AddAccountResponse>(ApiEndpoints.AddAccount, request, ct);

    public Task<AddAccountConfirmResponse> AddAccountConfirmAsync(AddAccountConfirmRequest request, CancellationToken ct = default) =>
        PostAsync<AddAccountConfirmRequest, AddAccountConfirmResponse>(ApiEndpoints.AddAccountConfirm, request, ct);

    public Task<DeleteUserResponse> DeleteUserAsync(DeleteUserRequest request, CancellationToken ct = default) =>
        PostAsync<DeleteUserRequest, DeleteUserResponse>(ApiEndpoints.DeleteUser, request, ct);

    public Task<BalanceQueryResponse> BalanceQueryAsync(BalanceQueryRequest request, CancellationToken ct = default) =>
        PostAsync<BalanceQueryRequest, BalanceQueryResponse>(ApiEndpoints.BalanceQuery, request, ct);

    public Task<GetPreSaleInfoResponse> GetPreSaleInfoAsync(GetPreSaleInfoRequest request, CancellationToken ct = default) =>
        PostAsync<GetPreSaleInfoRequest, GetPreSaleInfoResponse>(ApiEndpoints.GetPreSaleInfo, request, ct);

    public Task<SaleConfirmResponse> SaleConfirmAsync(SaleConfirmRequest request, CancellationToken ct = default) =>
        PostAsync<SaleConfirmRequest, SaleConfirmResponse>(ApiEndpoints.SaleConfirm, request, ct);

    public Task<GetSaleInfoResponse> GetSaleInfoAsync(GetSaleInfoRequest request, CancellationToken ct = default) =>
        PostAsync<GetSaleInfoRequest, GetSaleInfoResponse>(ApiEndpoints.GetSaleInfo, request, ct);

    public Task<TransactionHistoryResponse> TransactionHistoryAsync(TransactionHistoryRequest request, CancellationToken ct = default) =>
        PostAsync<TransactionHistoryRequest, TransactionHistoryResponse>(ApiEndpoints.TransactionHistory, request, ct);

    public Task<CustomerDetailReportResponse> CustomerDetailReportAsync(CustomerDetailReportRequest request, CancellationToken ct = default) =>
        PostAsync<CustomerDetailReportRequest, CustomerDetailReportResponse>(ApiEndpoints.CustomerDetailReport, request, ct);

    public Task<CustomerSummaryReportResponse> CustomerSummaryReportAsync(CustomerSummaryReportRequest request, CancellationToken ct = default) =>
        PostAsync<CustomerSummaryReportRequest, CustomerSummaryReportResponse>(ApiEndpoints.CustomerSummaryReport, request, ct);

    public Task<BalanceTransferResponse> BalanceTransferAsync(BalanceTransferRequest request, CancellationToken ct = default) =>
        PostAsync<BalanceTransferRequest, BalanceTransferResponse>(ApiEndpoints.BalanceTransfer, request, ct);

    public async Task<MerchantListResponse> MerchantListAsync(MerchantListRequest request, CancellationToken ct = default)
    {
        // LastListVersionDate sözleşmede internal set'lidir ve null serileşiyordu;
        // Metropol tarafı null'da "Beklenmedik bir hata" (90000) dönebildiği için
        // boş string'e normalize edilir (alan adı/tipi DEĞİŞMEZ — CLAUDE.md kural 6).
        request.LastListVersionDate ??= string.Empty;

        // Merchant verisi KAMUSALDIR (PII değil) — yanıt alan adlarını sözleşmeyle
        // karşılaştırabilmek için ham gövdenin başı loglanır (sürüm geliyor ama liste
        // hep boş geliyorsa muhtemel neden alan adı uyuşmazlığıdır, LESSONS 2026-06-12).
        var raw = await PostRawAsync(ApiEndpoints.MerchantList, request, ct);
        logger.LogInformation(
            "Metropol merchantlist ham yanıt (ilk 1500): {RawPrefix}",
            raw.Length <= 1500 ? raw : raw[..1500]);

        var result = JsonSerializer.Deserialize<MerchantListResponse>(raw, JsonOptions)
            ?? throw new InvalidOperationException("Metropol merchantlist yanıtı boş döndü.");
        LogBusinessError(ApiEndpoints.MerchantList, result);
        return result;
    }

    /// <summary>Ham gövde dönen POST — yalnız PII içermeyen uçlar için (merchantlist).</summary>
    private async Task<string> PostRawAsync<TRequest>(
        string endpoint, TRequest request, CancellationToken ct)
    {
        var response = await SendOnceAsync(endpoint, request, ct);

        // PostAsync ile aynı 404→token tazele→tek retry kuralı (merchantlist retry-safe).
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            response.Dispose();
            await tokenService.InvalidateAsync(ct);
            response = await SendOnceAsync(endpoint, request, ct);
        }

        using (response)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new MetropolEndpointUnavailableException(endpoint);
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync(ct);
        }
    }

    public Task<SendOtpResponse> SendOtpAsync(SendOtpRequest request, CancellationToken ct = default) =>
        PostAsync<SendOtpRequest, SendOtpResponse>(ApiEndpoints.SendOtp, request, ct);

    public Task<UserBalanceResponse> UserBalanceAsync(UserBalanceRequest request, CancellationToken ct = default) =>
        PostAsync<UserBalanceRequest, UserBalanceResponse>(ApiEndpoints.UserBalance, request, ct);

    public Task<ResetPinResponse> ResetPinAsync(ResetPinRequest request, CancellationToken ct = default) =>
        PostAsync<ResetPinRequest, ResetPinResponse>(ApiEndpoints.ResetPin, request, ct);

    public Task<DeactivateCardResponse> DeactivateCardAsync(DeactivateCardRequest request, CancellationToken ct = default) =>
        PostAsync<DeactivateCardRequest, DeactivateCardResponse>(ApiEndpoints.DeactivateCard, request, ct);

    /// <summary>
    /// 404'te token tazeleyip yeniden denemenin GÜVENLİ olduğu uçlar: para hareketi
    /// yaratmayan / SMS göndermeyen çağrılar. SaleConfirm, BalanceTransfer (çift işlem)
    /// ve AddAccount/Confirm (çift SMS / tek kullanımlık OTP) BİLEREK dışarıda.
    /// </summary>
    private static readonly HashSet<string> AuthRetrySafeEndpoints =
    [
        ApiEndpoints.BalanceQuery,
        ApiEndpoints.GetPreSaleInfo,
        ApiEndpoints.GetSaleInfo,
        ApiEndpoints.TransactionHistory,
        ApiEndpoints.MerchantList,
        ApiEndpoints.CustomerDetailReport,
        ApiEndpoints.CustomerSummaryReport,
        ApiEndpoints.DeleteUser,
    ];

    private async Task<TResponse> PostAsync<TRequest, TResponse>(
        string endpoint, TRequest request, CancellationToken ct)
    {
        var response = await SendOnceAsync(endpoint, request, ct);

        // Metropol GEÇERSİZ token'a 404 dönüyor (LESSONS 2026-06-12) ve token'ı bizim
        // TTL dolmadan kendi tarafında düşürebiliyor → güvenli uçlarda token tazelenip
        // BİR kez yeniden denenir; para/SMS uçları kullanıcı tekrarına bırakılır.
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound
            && AuthRetrySafeEndpoints.Contains(endpoint))
        {
            response.Dispose();
            logger.LogWarning(
                "Metropol 404 (muhtemel geçersiz token): {Endpoint} — token tazelenip yeniden deneniyor.",
                endpoint);
            await tokenService.InvalidateAsync(ct);
            response = await SendOnceAsync(endpoint, request, ct);
        }

        using (response)
        {
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new MetropolEndpointUnavailableException(endpoint);
            }

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, ct);
            if (result is null)
            {
                throw new InvalidOperationException($"Metropol yanıtı boş döndü ({endpoint}).");
            }

            LogBusinessError(endpoint, result);
            return result;
        }
    }

    private async Task<HttpResponseMessage> SendOnceAsync<TRequest>(
        string endpoint, TRequest request, CancellationToken ct)
    {
        var token = await tokenService.GetTokenAsync(ct);

        using var message = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(request, options: JsonOptions),
        };
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return await httpClient.SendAsync(message, ct);
    }

    /// <summary>
    /// ResponseCode != 0 ise uç + kod + sağlayıcı mesajını loglar (warning).
    /// Yanıt modellerinde alanlar ortak adlıdır; reflection ile okunur — istek
    /// gövdesi/PII loglanmaz, ResponseMessage Metropol'ün jenerik hata metnidir.
    /// </summary>
    private void LogBusinessError<TResponse>(string endpoint, TResponse result)
    {
        var type = typeof(TResponse);
        var code = type.GetProperty("ResponseCode")?.GetValue(result) as int?;
        if (code is null or 0)
        {
            return;
        }

        var providerMessage = type.GetProperty("ResponseMessage")?.GetValue(result) as string;
        logger.LogWarning(
            "Metropol iş hatası: {Endpoint} ResponseCode={ResponseCode} Mesaj={ProviderMessage}",
            endpoint, code, providerMessage ?? "(boş)");
    }
}
