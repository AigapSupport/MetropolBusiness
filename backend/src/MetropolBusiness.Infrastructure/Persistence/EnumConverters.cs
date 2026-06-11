using MetropolBusiness.Domain.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace MetropolBusiness.Infrastructure.Persistence;

/// <summary>
/// Enum ↔ DB text dönüşümleri. DB değerleri ARCHITECTURE §4.1 sözlüğüyle birebir:
/// enduser/company_admin/approver, active/passive/pending.
/// (ValueConverter expression tree ister; switch'ler statik metotlara taşındı.)
/// </summary>
internal static class EnumConverters
{
    public static readonly ValueConverter<UserRole, string> UserRoleConverter =
        new(role => UserRoleToDb(role), value => UserRoleFromDb(value));

    public static readonly ValueConverter<EntityStatus, string> EntityStatusConverter =
        new(status => EntityStatusToDb(status), value => EntityStatusFromDb(value));

    public static readonly ValueConverter<TenantStatus, string> TenantStatusConverter =
        new(status => TenantStatusToDb(status), value => TenantStatusFromDb(value));

    public static readonly ValueConverter<ContentStatus, string> ContentStatusConverter =
        new(status => ContentStatusToDb(status), value => ContentStatusFromDb(value));

    public static readonly ValueConverter<SurveyQuestionType, string> SurveyQuestionTypeConverter =
        new(type => SurveyQuestionTypeToDb(type), value => SurveyQuestionTypeFromDb(value));

    public static readonly ValueConverter<RequestStatus, string> RequestStatusConverter =
        new(status => RequestStatusToDb(status), value => RequestStatusFromDb(value));

    public static readonly ValueConverter<ConversationType, string> ConversationTypeConverter =
        new(type => ConversationTypeToDb(type), value => ConversationTypeFromDb(value));

    public static readonly ValueConverter<ChatSenderType, string> ChatSenderTypeConverter =
        new(type => ChatSenderTypeToDb(type), value => ChatSenderTypeFromDb(value));

    internal static string ConversationTypeToDb(ConversationType type) => type switch
    {
        ConversationType.Direct => "direct",
        ConversationType.Assistant => "assistant",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, null),
    };

    internal static ConversationType ConversationTypeFromDb(string value) => value switch
    {
        "direct" => ConversationType.Direct,
        "assistant" => ConversationType.Assistant,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    internal static string ChatSenderTypeToDb(ChatSenderType type) => type switch
    {
        ChatSenderType.User => "user",
        ChatSenderType.Assistant => "assistant",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, null),
    };

    internal static ChatSenderType ChatSenderTypeFromDb(string value) => value switch
    {
        "user" => ChatSenderType.User,
        "assistant" => ChatSenderType.Assistant,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    internal static string RequestStatusToDb(RequestStatus status) => status switch
    {
        RequestStatus.Pending => "pending",
        RequestStatus.Approved => "approved",
        RequestStatus.Rejected => "rejected",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    internal static RequestStatus RequestStatusFromDb(string value) => value switch
    {
        "pending" => RequestStatus.Pending,
        "approved" => RequestStatus.Approved,
        "rejected" => RequestStatus.Rejected,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    // Kimlik sözlükleri DTO eşlemesinde de kullanılır (Me/Company/Platform servisleri);
    // bu yüzden internal-görünür (Content sözlükleriyle aynı gerekçe).

    internal static string UserRoleToDb(UserRole role) => role switch
    {
        UserRole.EndUser => "enduser",
        UserRole.CompanyAdmin => "company_admin",
        UserRole.Approver => "approver",
        UserRole.PlatformAdmin => "platform_admin",
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, null),
    };

    internal static UserRole UserRoleFromDb(string value) => value switch
    {
        "enduser" => UserRole.EndUser,
        "company_admin" => UserRole.CompanyAdmin,
        "approver" => UserRole.Approver,
        "platform_admin" => UserRole.PlatformAdmin,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    internal static string EntityStatusToDb(EntityStatus status) => status switch
    {
        EntityStatus.Active => "active",
        EntityStatus.Passive => "passive",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    private static EntityStatus EntityStatusFromDb(string value) => value switch
    {
        "active" => EntityStatus.Active,
        "passive" => EntityStatus.Passive,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    internal static string TenantStatusToDb(TenantStatus status) => status switch
    {
        TenantStatus.Pending => "pending",
        TenantStatus.Active => "active",
        TenantStatus.Passive => "passive",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    private static TenantStatus TenantStatusFromDb(string value) => value switch
    {
        "pending" => TenantStatus.Pending,
        "active" => TenantStatus.Active,
        "passive" => TenantStatus.Passive,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    // İçerik sözlükleri DTO eşlemesinde de kullanılır (ContentService); bu yüzden internal-görünür.

    internal static string ContentStatusToDb(ContentStatus status) => status switch
    {
        ContentStatus.Draft => "draft",
        ContentStatus.Published => "published",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    internal static ContentStatus ContentStatusFromDb(string value) => value switch
    {
        "draft" => ContentStatus.Draft,
        "published" => ContentStatus.Published,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };

    internal static string SurveyQuestionTypeToDb(SurveyQuestionType type) => type switch
    {
        SurveyQuestionType.Single => "single",
        SurveyQuestionType.Multi => "multi",
        SurveyQuestionType.Text => "text",
        SurveyQuestionType.Rating => "rating",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, null),
    };

    internal static SurveyQuestionType SurveyQuestionTypeFromDb(string value) => value switch
    {
        "single" => SurveyQuestionType.Single,
        "multi" => SurveyQuestionType.Multi,
        "text" => SurveyQuestionType.Text,
        "rating" => SurveyQuestionType.Rating,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null),
    };
}
