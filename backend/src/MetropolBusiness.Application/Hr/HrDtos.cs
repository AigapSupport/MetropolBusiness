namespace MetropolBusiness.Application.Hr;

/// <summary>docs/API_CONTRACT.md §11 — İK modülleri DTO'ları. Para string "1500.00".</summary>
public sealed record CreateLeaveRequestDto(
    string Type, DateOnly StartDate, DateOnly EndDate, string? Note);

public sealed record LeaveRequestDto(
    Guid Id, string Type, DateOnly StartDate, DateOnly EndDate, int Days, string? Note,
    string Status, Guid? DecidedBy, DateTimeOffset? DecidedAt, DateTimeOffset CreatedAt);

public sealed record CreateExpenseRequestDto(
    string Type, string Amount, DateOnly Date, string? ReceiptUrl, string? Note);

public sealed record ExpenseRequestDto(
    Guid Id, string Type, string Amount, DateOnly Date, string? ReceiptUrl, string? Note,
    string Status, Guid? DecidedBy, DateTimeOffset? DecidedAt, DateTimeOffset CreatedAt,
    string? RequesterName = null);

public sealed record DecisionDto(string? Note);
