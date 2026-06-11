namespace MetropolBusiness.Application.Hr;

/// <summary>Modül kodları — platform tanımları ve seed.sql ile aynı sözlük.</summary>
public static class ModuleCodes
{
    public const string LeaveRequest = "leave_request";
    public const string ExpenseRequest = "expense_request";
    public const string ExpenseApproval = "expense_approval";
}

/// <summary>
/// Modül yetki kontrolü (PANELS_SPEC §C zinciri, PRD §2.1): kullanıcının segmentlerine
/// atanmış AKTİF modüller içinde kod var mı? Yetki HER ZAMAN backend'de doğrulanır;
/// istemcide gizlemek tek başına yeterli güvenlik değildir (CLAUDE.md §5).
/// </summary>
public interface IModuleAccessChecker
{
    Task<bool> HasModuleAsync(Guid userId, string moduleCode, CancellationToken ct = default);
}
