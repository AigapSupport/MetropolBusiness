using MetropolBusiness.Integration.Metropol.Services;
using static MetropolBusiness.Integration.Metropol.Models.MetropolModels;

namespace MetropolBusiness.UnitTests.Cards;

/// <summary>
/// Kayıt eden (recording) IMetropolApiClient fake'i: kart/bakiye testlerinde
/// upstream'e giden istekler doğrulanır (örn. delete'te doğru UserRefNo gitti mi,
/// cache'te ikinci çağrı upstream'e gitmedi mi). Yanıtlar test başına ayarlanabilir.
/// Kullanılmayan uçlar bilinçli olarak NotSupportedException atar (yanlış uç çağrısı
/// testte anında görünür).
/// </summary>
internal sealed class FakeMetropolApiClient : IMetropolApiClient
{
    public List<AddAccountRequest> AddAccountCalls { get; } = [];
    public List<AddAccountConfirmRequest> ConfirmCalls { get; } = [];
    public List<DeleteUserRequest> DeleteUserCalls { get; } = [];
    public List<BalanceQueryRequest> BalanceCalls { get; } = [];
    public List<TransactionHistoryRequest> TransactionCalls { get; } = [];
    public List<GetPreSaleInfoRequest> PreSaleCalls { get; } = [];
    public List<SaleConfirmRequest> SaleConfirmCalls { get; } = [];
    public List<GetSaleInfoRequest> SaleInfoCalls { get; } = [];
    public List<BalanceTransferRequest> BalanceTransferCalls { get; } = [];

    public AddAccountResponse NextAddAccountResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
        ValidationGuid = "validation-guid-1",
    };

    public AddAccountConfirmResponse NextConfirmResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
        UserAccountToken = "PLAIN-TOKEN-001",
        MaskedCardNo = "637******976",
        Name = "Test",
        SurName = "Deneme",
    };

    public DeleteUserResponse NextDeleteUserResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
    };

    /// <summary>
    /// Doluysa BalanceQueryAsync bu istisnayı fırlatır — Metropol ERİŞİLEMEZLİK senaryosu
    /// (KARAR 2026-06-11: snapshot varsa stale yanıt, yoksa eski davranış test edilir).
    /// </summary>
    public Exception? NextBalanceException { get; set; }

    public BalanceQueryResponse NextBalanceResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
        UserBalance =
        [
            new UserBalance { WalletId = 1, WalletName = "RESTO", Balance = 30824.00m },
            new UserBalance { WalletId = 3, WalletName = "GIFT", Balance = 44581.00m },
        ],
    };

    public TransactionHistoryResponse NextTransactionResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
        RowCount = 0,
        PaymentInfo = [],
    };

    public GetPreSaleInfoResponse NextPreSaleResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
        TransactionId = 98598610,
        SaleRefCode = "2020-REF",
        MerchantNo = "0000052485",
        TerminalNo = "0000063710",
        MerchantName = "Elif Telefon Testi",
        CityName = "Antalya",
        DistrictName = "Aksu",
        RequestAmount = 200.00m,
        ProductId = 2,
        ProductName = "Resto-Yemek",
        KDV = "1,00",
        DiscountRatio = "0,00",
        SessionExpireDate = "2026-04-01T08:38:40Z",
    };

    public SaleConfirmResponse NextSaleConfirmResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
        MerchantNo = "0000052485",
        TerminalNo = "0000063710",
        TransactionAmount = 200.00m,
    };

    public GetSaleInfoResponse NextSaleInfoResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
        MerchantCode = "0000052485",
        TerminalCode = "0000063710",
        TransactionId = "20040736",
        TransactionStatus = 1,
        TransactionAmount = 200.00m,
        SaleRefCode = "2020-REF",
        CardNo = "6375021912342976",
        CardBalance = 30624.00m,
    };

    public BalanceTransferResponse NextBalanceTransferResponse { get; set; } = new()
    {
        ResponseCode = 0,
        ResponseMessage = "OK",
    };

    public Task<AddAccountResponse> AddAccountAsync(
        AddAccountRequest request, CancellationToken ct = default)
    {
        AddAccountCalls.Add(request);
        return Task.FromResult(NextAddAccountResponse);
    }

    public Task<AddAccountConfirmResponse> AddAccountConfirmAsync(
        AddAccountConfirmRequest request, CancellationToken ct = default)
    {
        ConfirmCalls.Add(request);
        return Task.FromResult(NextConfirmResponse);
    }

    public Task<DeleteUserResponse> DeleteUserAsync(
        DeleteUserRequest request, CancellationToken ct = default)
    {
        DeleteUserCalls.Add(request);
        return Task.FromResult(NextDeleteUserResponse);
    }

    public Task<BalanceQueryResponse> BalanceQueryAsync(
        BalanceQueryRequest request, CancellationToken ct = default)
    {
        BalanceCalls.Add(request);
        return NextBalanceException is not null
            ? Task.FromException<BalanceQueryResponse>(NextBalanceException)
            : Task.FromResult(NextBalanceResponse);
    }

    public Task<TransactionHistoryResponse> TransactionHistoryAsync(
        TransactionHistoryRequest request, CancellationToken ct = default)
    {
        TransactionCalls.Add(request);
        return Task.FromResult(NextTransactionResponse);
    }

    public Task<GetPreSaleInfoResponse> GetPreSaleInfoAsync(
        GetPreSaleInfoRequest request, CancellationToken ct = default)
    {
        PreSaleCalls.Add(request);
        return Task.FromResult(NextPreSaleResponse);
    }

    public Task<SaleConfirmResponse> SaleConfirmAsync(
        SaleConfirmRequest request, CancellationToken ct = default)
    {
        SaleConfirmCalls.Add(request);
        return Task.FromResult(NextSaleConfirmResponse);
    }

    public Task<GetSaleInfoResponse> GetSaleInfoAsync(
        GetSaleInfoRequest request, CancellationToken ct = default)
    {
        SaleInfoCalls.Add(request);
        return Task.FromResult(NextSaleInfoResponse);
    }

    public Task<CustomerDetailReportResponse> CustomerDetailReportAsync(
        CustomerDetailReportRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Bu test fake'i CustomerDetailReport desteklemez.");

    public Task<CustomerSummaryReportResponse> CustomerSummaryReportAsync(
        CustomerSummaryReportRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Bu test fake'i CustomerSummaryReport desteklemez.");

    public Task<BalanceTransferResponse> BalanceTransferAsync(
        BalanceTransferRequest request, CancellationToken ct = default)
    {
        BalanceTransferCalls.Add(request);
        return Task.FromResult(NextBalanceTransferResponse);
    }

    public Task<MerchantListResponse> MerchantListAsync(
        MerchantListRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Bu test fake'i MerchantList desteklemez (Faz 1.7).");

    public Task<SendOtpResponse> SendOtpAsync(
        SendOtpRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Bu test fake'i SendOtp desteklemez.");

    public Task<UserBalanceResponse> UserBalanceAsync(
        UserBalanceRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Bu test fake'i UserBalance desteklemez.");

    public Task<ResetPinResponse> ResetPinAsync(
        ResetPinRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Bu test fake'i ResetPin desteklemez.");

    public Task<DeactivateCardResponse> DeactivateCardAsync(
        DeactivateCardRequest request, CancellationToken ct = default) =>
        throw new NotSupportedException("Bu test fake'i DeactivateCard desteklemez.");
}
