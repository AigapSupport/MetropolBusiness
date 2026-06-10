using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.Integration.Metropol.Services;

/// <summary>
/// Metropol API'sinin tipli soyutlaması (ApiBaseUrl tarafı, TODO 1.3).
/// Tüm çağrılar Bearer token'lıdır (MetropolTokenService). Uygulama servisleri
/// (Faz 1.4–1.7) bu arayüzü kullanır; ResponseCode != 0 hatası burada FIRLATILMAZ —
/// iş kuralı eşlemesi (MetropolErrorCatalog ile Türkçe mesaj) çağıran servise aittir.
/// </summary>
public interface IMetropolApiClient
{
    Task<AddAccountResponse> AddAccountAsync(AddAccountRequest request, CancellationToken ct = default);
    Task<AddAccountConfirmResponse> AddAccountConfirmAsync(AddAccountConfirmRequest request, CancellationToken ct = default);
    Task<DeleteUserResponse> DeleteUserAsync(DeleteUserRequest request, CancellationToken ct = default);
    Task<BalanceQueryResponse> BalanceQueryAsync(BalanceQueryRequest request, CancellationToken ct = default);
    Task<GetPreSaleInfoResponse> GetPreSaleInfoAsync(GetPreSaleInfoRequest request, CancellationToken ct = default);
    Task<SaleConfirmResponse> SaleConfirmAsync(SaleConfirmRequest request, CancellationToken ct = default);
    Task<GetSaleInfoResponse> GetSaleInfoAsync(GetSaleInfoRequest request, CancellationToken ct = default);
    Task<TransactionHistoryResponse> TransactionHistoryAsync(TransactionHistoryRequest request, CancellationToken ct = default);
    Task<CustomerDetailReportResponse> CustomerDetailReportAsync(CustomerDetailReportRequest request, CancellationToken ct = default);
    Task<CustomerSummaryReportResponse> CustomerSummaryReportAsync(CustomerSummaryReportRequest request, CancellationToken ct = default);
    Task<BalanceTransferResponse> BalanceTransferAsync(BalanceTransferRequest request, CancellationToken ct = default);
    Task<MerchantListResponse> MerchantListAsync(MerchantListRequest request, CancellationToken ct = default);
    Task<SendOtpResponse> SendOtpAsync(SendOtpRequest request, CancellationToken ct = default);
    Task<UserBalanceResponse> UserBalanceAsync(UserBalanceRequest request, CancellationToken ct = default);
    Task<ResetPinResponse> ResetPinAsync(ResetPinRequest request, CancellationToken ct = default);
    Task<DeactivateCardResponse> DeactivateCardAsync(DeactivateCardRequest request, CancellationToken ct = default);
}
