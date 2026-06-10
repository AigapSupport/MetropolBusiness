// METROPOL API SÖZLEŞMESİ — kaynak dosya 2026-06-10'da proje sahibi tarafından sağlandı
// (repo köküne bırakıldı, buraya taşındı; TODO 1.3 "MetropolModels.cs taşı + namespace düzenle").
//
// CLAUDE.md kural 6: DTO alan adları ve tipleri Metropol'ün API kontratıdır — DEĞİŞTİRİLMEZ.
// Orijinale göre yapılan (kontratı değiştirmeyen) düzenlemeler:
//   - namespace: MorfozAIMLCoreApi.MetropolService → MetropolBusiness.Integration.Metropol.Models
//   - Newtonsoft.Json bağımlılığı kaldırıldı: [JsonProperty("CardNo")] vb. öznitelikler özellik
//     adlarıyla birebir aynıydı (tel formatı değişmedi); System.Text.Json varsayılanı PascalCase yazar.
//   - kullanılmayan using'ler kaldırıldı; dış sözleşme tipleri için nullable uyarıları kapatıldı.
#nullable disable

namespace MetropolBusiness.Integration.Metropol.Models
{
    public class MetropolModels
    {
        public static class ApiEndpoints
        {
            public const string MetropolApiBaseUrl = "https://testapi.metropolcard.com";
            public const string MetropolApiAuthBaseUrl = "https://testauth.metropolodeme.com";
            public const string GenerateToken = "/GenerateToken";
            public const string GetDate = "/GenerateToken/getdate";
            public const string AddAccount = "/vpos/v3/account/add/limited";
            public const string AddAccountConfirm = "/vpos/v3/account/confirm/limited";
            public const string BalanceQuery = "/vpos/v3/query/balance";
            public const string CreateCode = "/vpos/v2/sale/createcode";
            public const string GetPreSaleInfo = "/vpos/v2/sale/preinfo";
            public const string SaleConfirm = "/vpos/v2/sale/confirm";
            public const string GetSaleInfo = "/vpos/v2/sale/saleinfo";
            public const string CustomerSummaryReport = "/vpos/v2/report/customersummary";
            public const string CustomerDetailReport = "/vpos/v2/report/customerdetail";
            public const string MerchantList = "/vpos/v2/report/merchantlist";
            public const string TransactionHistory = "/vpos/v2/account/transactionhistory";
            public const string BalanceTransfer = "/vpos/v2/order/balancetransfer";
            public const string SendOtp = "/ivr/v1/sendotp";
            public const string UserBalance = "/ivr/v1/userbalance";
            public const string ResetPin = "/ivr/v1/forgotmypin";
            public const string DeactivateCard = "/ivr/v1/deactivatecard";
            public const string DeleteUser = "/vpos/v2/account/delete";
        }

        public class AccessData
        {
            public string AccessKey { get; set; }
            public DateTime CreateDate { get; set; }
        }

        public class GenerateTokenRequest
        {
            public string ConsumerId { get; set; }
            public string ConsumerName { get; set; }
            public string SecureAccessData { get; set; }
            public string RefNo { get; set; }
        }

        public class GenerateTokenData
        {
            public string token { get; set; }
            public DateTime expiration { get; set; }
        }

        public class GenerateTokenResponse
        {
            public GenerateTokenData data { get; set; }
            public bool success { get; set; }
            public string responseMessage { get; set; }
            public int responseCode { get; set; }
        }

        public class GenericHttpPostResult<T>
        {
            public bool Success { get; set; }
            public string ErrorMessage { get; set; }
            public string ErrorCode { get; set; }
            public T Data { get; set; }
        }

        public class AddAccountRequest
        {
            public string CardNo { get; set; }
            public string MobilePhone { get; set; }
        }

        public class AddAccountResponse
        {
            public string ValidationGuid { get; set; }
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class AddAccountConfirmRequest
        {
            public string ValidationGuid { get; set; }
            public int ValidationCode { get; set; }
            public string Phone { get; set; }
            public string MemberId { get; set; }
            public string Email { get; set; }
            public string TCKN { get; set; }
        }

        public class AddAccountConfirmResponse
        {
            public string UserAccountToken { get; set; }
            public string MaskedCardNo { get; set; }
            public string Name { get; set; }
            public string SurName { get; set; }
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class BalanceQueryRequest
        {
            public int UserRefType { get; set; }
            public string UserRefNo { get; set; }
            public int WalletId { get; set; }
        }

        public class UserBalance
        {
            public int WalletId { get; set; }
            public decimal Balance { get; set; }
            public string WalletName { get; set; }
        }

        public class BalanceQueryResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public List<UserBalance> UserBalance { get; set; }
        }

        public class CreateCodeRequest
        {
            public string MerchantCode { get; set; }
            public string TerminalCode { get; set; }
            public decimal TransactionAmount { get; set; }
            public int ProductId { get; set; }
            public string SaleRefCode { get; set; }
        }

        public class CreateCodeResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public int TransactionId { get; set; }
            public string QRCode { get; set; }
            public string ShortCode { get; set; }
            public DateTime ExpireDate { get; set; }
        }

        public class GetPreSaleInfoRequest
        {
            public string Code { get; set; }
            public int CodeType { get; set; }
            public string MemberId { get; set; }
            public string UserAccountRef { get; set; }
        }

        public class GetPreSaleInfoResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public int TransactionId { get; set; }
            public string SaleRefCode { get; set; }
            public string MerchantNo { get; set; }
            public string TerminalNo { get; set; }
            public string MerchantName { get; set; }
            public int BrandId { get; set; }
            public string BrandName { get; set; }
            public string CityName { get; set; }
            public string DistrictName { get; set; }
            public decimal RequestAmount { get; set; }
            public int BatchNo { get; set; }
            public int ProductId { get; set; }
            public string ProductName { get; set; }
            public string KDV { get; set; }
            public string DiscountRatio { get; set; }
            public string CurrencyId { get; set; }
            public string SessionExpireDate { get; set; }
            public string ErrorMessage { get; set; }
        }

        public class PaymentInfo
        {
            public int PaymentTypeId { get; set; }
            public string UserAccountRef { get; set; }
            public decimal PaymentAmount { get; set; }
            public int WalletId { get; set; }
            public string BankRefCode { get; set; }
        }

        public class SaleConfirmRequest
        {
            public List<PaymentInfo> PaymentInfo { get; set; }
            public decimal TransactionAmount { get; set; }
            public int TransactionId { get; set; }
            public string SaleRefCode { get; set; }
            public string ConsumerRefCode { get; set; }
        }

        public class SaleConfirmResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public string MerchantNo { get; set; }
            public string TerminalNo { get; set; }
            public decimal TransactionAmount { get; set; }
        }

        public class GetSaleInfoRequest
        {
            public string MerchantCode { get; set; }
            public string TerminalCode { get; set; }
            public string SaleRefCode { get; set; }
        }

        public class GetSaleInfoResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public string MerchantCode { get; set; }
            public string TerminalCode { get; set; }
            public string TransactionId { get; set; }
            public int TransactionStatus { get; set; }
            public decimal TransactionAmount { get; set; }
            public string SaleRefCode { get; set; }
            public string CardNo { get; set; }
            public decimal CardBalance { get; set; }
        }

        public class CustomerSummaryReportRequest
        {
            public int CustomerNo { get; set; }
            public string StartDate { get; set; }
            public string EndDate { get; set; }
        }

        public class CustomerSummaryItem
        {
            public int TranType { get; set; }
            public string TranTypeName { get; set; }
            public int ProductId { get; set; }
            public int Count { get; set; }
            public decimal Amount { get; set; }
        }

        public class CustomerSummaryReportResponse
        {
            public decimal TotalAmount { get; set; }
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public List<string> ErrorMessage { get; set; }
            public List<CustomerSummaryItem> CustomerSummaryReport { get; set; }
        }

        public class CustomerDetailReportRequest
        {
            public int CustomerNo { get; set; }
            public string StartDate { get; set; }
            public string EndDate { get; set; }
            public string PageIndex { get; set; }
        }

        public class CustomerTransactionItem
        {
            public int DiscountRatio { get; set; }
            public decimal DiscountAmount { get; set; }
            public int BatchNo { get; set; }
            public int TransactionStatus { get; set; }
            public int TransactionId { get; set; }
            public int TranType { get; set; }
            public int ProductId { get; set; }
            public int RelationTransactionId { get; set; }
            public string ReferanceNo { get; set; }
            public decimal Amount { get; set; }
            public DateTime TransactionDate { get; set; }
        }

        public class CustomerDetailReportResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public int TotalPage { get; set; }
            public int TotalTransaction { get; set; }
            public int PageIndex { get; set; }
            public int PageTransactionCount { get; set; }
            public string ErrorMessage { get; set; }
            public List<CustomerTransactionItem> TransactionList { get; set; }
        }

        public class MerchantListRequest
        {
            public int SectorId { get; set; }
            public string LastChangeStateDate { get; set; }
            public int ListType { get; set; }
            public string LastListVersionDate { get; internal set; }
        }

        public class MerchantItem
        {
            public int ActiveFlag { get; set; }
            public string MerchantState { get; set; }
            public string Sector { get; set; }
            public string SubSector { get; set; }
            public string InvoiceTitle { get; set; }
            public string City { get; set; }
            public string District { get; set; }
            public string SaleAddress { get; set; }
            public string TelNo { get; set; }
            public string Lat { get; set; }
            public string Lng { get; set; }
            public string MerchantCode { get; set; }
            public string SignboardName { get; set; }
            public string IsChippinUse { get; set; }
            public int CampaignCode { get; set; }
        }

        public class MerchantListResponse
        {
            public List<MerchantItem> MerchantList { get; set; }
            public string LastListVersionDate { get; set; }
            public int ListType { get; set; }
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class TransactionHistoryRequest
        {
            public string UserAccountRef { get; set; }
        }

        public class TransactionHistoryItem
        {
            public string MerchantCode { get; set; }
            public string TerminalCode { get; set; }
            public string TransactionInfo { get; set; }
            public int TransactionId { get; set; }
            public int TranTypeId { get; set; }
            public string ProductName { get; set; }
            public decimal Amount { get; set; }
            public string TransactionDate { get; set; }
            public string BranchName { get; set; }
        }

        public class TransactionHistoryResponse
        {
            public List<TransactionHistoryItem> PaymentInfo { get; set; }
            public int RowCount { get; set; }
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class BalanceTransferRequest
        {
            public string SenderCardToken { get; set; }
            public string ReceiverCardToken { get; set; }
            public int WalletId { get; set; }
            public int Amount { get; set; }
        }

        public class BalanceTransferResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class SendOtpRequest
        {
            public string CardNo { get; set; }
            public string MobileNo { get; set; }
        }

        public class SendOtpResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
            public string OtpRefCode { get; set; }
        }

        public class UserBalanceRequest
        {
            public string CardNo { get; set; }
            public string MobileNo { get; set; }
            public string OtpRefCode { get; set; }
            public string Otp { get; set; }
        }

        public class UserBalanceResponse
        {
            public string Name { get; set; }
            public string CardNo { get; set; }
            public List<UserBalanceList> UserBalanceList { get; set; }
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class UserBalanceList
        {
            public int WalletId { get; set; }
            public decimal Balance { get; set; }
            public string WalletName { get; set; }
        }

        public class ResetPinRequest
        {
            public string CardNo { get; set; }
            public string MobileNo { get; set; }
            public string OtpRefCode { get; set; }
            public string Otp { get; set; }
        }

        public class ResetPinResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class DeactivateCardRequest
        {
            public string CardNo { get; set; }
            public string MobileNo { get; set; }
            public string OtpRefCode { get; set; }
            public string Otp { get; set; }
        }

        public class DeactivateCardResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }

        public class DeleteUserRequest
        {
            public string UserRefType { get; set; }
            public string UserRefNo { get; set; }
        }

        public class DeleteUserResponse
        {
            public int ResponseCode { get; set; }
            public string ResponseMessage { get; set; }
        }
    }
}
