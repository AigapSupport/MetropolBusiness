using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// IMetropolApiClient HTTP implementasyonu. Her çağrıda MetropolTokenService'ten
/// geçerli Bearer token alınır (cache'li). İstek/yanıt gövdeleri ve kart no/TCKN
/// LOG'LANMAZ (CLAUDE.md kural 4). Retry YOK: para uçlarında (SaleConfirm,
/// BalanceTransfer) çift işlem riski nedeniyle yeniden deneme uygulama katmanında
/// idempotency ile yönetilir (CLAUDE.md §6, ARCHITECTURE §5.2).
/// </summary>
public sealed class MetropolApiClient(HttpClient httpClient, MetropolTokenService tokenService)
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

    public Task<MerchantListResponse> MerchantListAsync(MerchantListRequest request, CancellationToken ct = default) =>
        PostAsync<MerchantListRequest, MerchantListResponse>(ApiEndpoints.MerchantList, request, ct);

    public Task<SendOtpResponse> SendOtpAsync(SendOtpRequest request, CancellationToken ct = default) =>
        PostAsync<SendOtpRequest, SendOtpResponse>(ApiEndpoints.SendOtp, request, ct);

    public Task<UserBalanceResponse> UserBalanceAsync(UserBalanceRequest request, CancellationToken ct = default) =>
        PostAsync<UserBalanceRequest, UserBalanceResponse>(ApiEndpoints.UserBalance, request, ct);

    public Task<ResetPinResponse> ResetPinAsync(ResetPinRequest request, CancellationToken ct = default) =>
        PostAsync<ResetPinRequest, ResetPinResponse>(ApiEndpoints.ResetPin, request, ct);

    public Task<DeactivateCardResponse> DeactivateCardAsync(DeactivateCardRequest request, CancellationToken ct = default) =>
        PostAsync<DeactivateCardRequest, DeactivateCardResponse>(ApiEndpoints.DeactivateCard, request, ct);

    private async Task<TResponse> PostAsync<TRequest, TResponse>(
        string endpoint, TRequest request, CancellationToken ct)
    {
        var token = await tokenService.GetTokenAsync(ct);

        using var message = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(request, options: JsonOptions),
        };
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await httpClient.SendAsync(message, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, ct);
        return result
            ?? throw new InvalidOperationException($"Metropol yanıtı boş döndü ({endpoint}).");
    }
}
