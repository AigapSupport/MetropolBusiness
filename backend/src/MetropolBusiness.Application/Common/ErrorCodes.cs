namespace MetropolBusiness.Application.Common;

/// <summary>Makine-okur hata kodları (docs/API_CONTRACT.md §14 sözlüğü).</summary>
public static class ErrorCodes
{
    public const string ValidationError = "VALIDATION_ERROR";
    public const string Unauthenticated = "UNAUTHENTICATED";
    public const string NotAuthorized = "NOT_AUTHORIZED";
    public const string NotAuthorizedModule = "NOT_AUTHORIZED_MODULE";
    public const string NotFound = "NOT_FOUND";
    public const string OtpInvalid = "OTP_INVALID";
    public const string OtpLocked = "OTP_LOCKED";
    public const string LoginLocked = "LOGIN_LOCKED";
    public const string OtpRateLimit = "OTP_RATE_LIMIT";
    public const string RefreshInvalid = "REFRESH_INVALID";
    public const string SurveyAlreadyAnswered = "SURVEY_ALREADY_ANSWERED";
    public const string DuplicateOperation = "DUPLICATE_OPERATION";
    public const string MetropolError = "METROPOL_ERROR";
    public const string ProviderUnavailable = "PROVIDER_UNAVAILABLE";
    public const string RateLimited = "RATE_LIMITED";
    public const string InternalError = "INTERNAL_ERROR";
}
