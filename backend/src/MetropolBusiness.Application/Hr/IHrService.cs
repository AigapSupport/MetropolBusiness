using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Hr;

/// <summary>
/// İK talepleri (API_CONTRACT §11, PRD §10). Her uçta önce modül yetkisi doğrulanır
/// (NOT_AUTHORIZED_MODULE 403). Onay tek aşamalıdır (PRD §17.6): expense_approval
/// modül yetkisi masraf VE izin onayını kapsar (ayrı leave_approval modülü ilk
/// sürümde tanımlanmadı — ihtiyaç olursa ModuleCodes'a eklenir).
/// </summary>
public interface IHrService
{
    Task<Result<IReadOnlyList<LeaveRequestDto>>> GetMyLeaveRequestsAsync(CancellationToken ct = default);
    Task<Result<LeaveRequestDto>> CreateLeaveRequestAsync(CreateLeaveRequestDto request, CancellationToken ct = default);
    Task<Result<LeaveRequestDto>> DecideLeaveRequestAsync(Guid id, bool approve, DecisionDto decision, CancellationToken ct = default);

    Task<Result<IReadOnlyList<ExpenseRequestDto>>> GetMyExpenseRequestsAsync(CancellationToken ct = default);
    Task<Result<ExpenseRequestDto>> CreateExpenseRequestAsync(CreateExpenseRequestDto request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<ExpenseRequestDto>>> GetPendingExpenseRequestsAsync(CancellationToken ct = default);
    Task<Result<IReadOnlyList<LeaveRequestDto>>> GetPendingLeaveRequestsAsync(CancellationToken ct = default);
    Task<Result<ExpenseRequestDto>> DecideExpenseRequestAsync(Guid id, bool approve, DecisionDto decision, CancellationToken ct = default);

    /// <summary>Firma admin genel görünümü (API_CONTRACT §12) — onay yetkisi gerektirmez.</summary>
    Task<PagedResponse<LeaveRequestDto>> GetCompanyLeaveRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResponse<ExpenseRequestDto>> GetCompanyExpenseRequestsAsync(string? status, int page, int pageSize, CancellationToken ct = default);
}
