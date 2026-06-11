using System.Globalization;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Hr;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Hr;

/// <summary>
/// İK talepleri (API_CONTRACT §11, PRD §10): her uçta önce modül yetkisi
/// (NOT_AUTHORIZED_MODULE 403, PRD §2.1 backend zorunlu kontrol). Onay tek aşamalı
/// (PRD §17.6); kullanıcı kendi talebini onaylayamaz; yalnız pending'ten karar verilir.
/// </summary>
public sealed class HrService(
    AppDbContext dbContext,
    ITenantContext tenantContext,
    IModuleAccessChecker moduleAccess,
    TimeProvider timeProvider) : IHrService
{
    public async Task<Result<IReadOnlyList<LeaveRequestDto>>> GetMyLeaveRequestsAsync(
        CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var denied = await EnsureModuleAsync(userId, ModuleCodes.LeaveRequest, ct);
        if (denied is not null)
        {
            return Result<IReadOnlyList<LeaveRequestDto>>.Fail(denied);
        }

        var requests = await dbContext.LeaveRequests.AsNoTracking()
            .Where(l => l.UserId == userId)
            .ToListAsync(ct);

        return Result<IReadOnlyList<LeaveRequestDto>>.Ok(
            requests.OrderByDescending(l => l.CreatedAt).Select(ToDto).ToList());
    }

    public async Task<Result<LeaveRequestDto>> CreateLeaveRequestAsync(
        CreateLeaveRequestDto request, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var denied = await EnsureModuleAsync(userId, ModuleCodes.LeaveRequest, ct);
        if (denied is not null)
        {
            return Result<LeaveRequestDto>.Fail(denied);
        }

        if (string.IsNullOrWhiteSpace(request.Type))
        {
            return Result<LeaveRequestDto>.Fail(new Error(
                ErrorCodes.ValidationError, "İzin tipi zorunludur.", 400, new { field = "type" }));
        }

        // Gün sayısını backend hesaplar (API_CONTRACT §11): bitiş − başlangıç + 1.
        var days = request.EndDate.DayNumber - request.StartDate.DayNumber + 1;
        if (days <= 0)
        {
            return Result<LeaveRequestDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Bitiş tarihi başlangıçtan önce olamaz.", 400,
                new { field = "endDate" }));
        }

        var leave = new LeaveRequest
        {
            UserId = userId,
            Type = request.Type.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Days = days,
            Note = request.Note,
        };
        dbContext.LeaveRequests.Add(leave);
        await dbContext.SaveChangesAsync(ct);

        return Result<LeaveRequestDto>.Ok(ToDto(leave));
    }

    public Task<Result<LeaveRequestDto>> DecideLeaveRequestAsync(
        Guid id, bool approve, DecisionDto decision, CancellationToken ct = default) =>
        DecideAsync(dbContext.LeaveRequests, id, approve, decision, ToDto, ct);

    public async Task<Result<IReadOnlyList<ExpenseRequestDto>>> GetMyExpenseRequestsAsync(
        CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var denied = await EnsureModuleAsync(userId, ModuleCodes.ExpenseRequest, ct);
        if (denied is not null)
        {
            return Result<IReadOnlyList<ExpenseRequestDto>>.Fail(denied);
        }

        var requests = await dbContext.ExpenseRequests.AsNoTracking()
            .Where(e => e.UserId == userId)
            .ToListAsync(ct);

        return Result<IReadOnlyList<ExpenseRequestDto>>.Ok(
            requests.OrderByDescending(e => e.CreatedAt).Select(e => ToDto(e, null)).ToList());
    }

    public async Task<Result<ExpenseRequestDto>> CreateExpenseRequestAsync(
        CreateExpenseRequestDto request, CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var denied = await EnsureModuleAsync(userId, ModuleCodes.ExpenseRequest, ct);
        if (denied is not null)
        {
            return Result<ExpenseRequestDto>.Fail(denied);
        }

        if (string.IsNullOrWhiteSpace(request.Type))
        {
            return Result<ExpenseRequestDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Masraf tipi zorunludur.", 400, new { field = "type" }));
        }

        if (!decimal.TryParse(request.Amount, NumberStyles.Number, CultureInfo.InvariantCulture,
                out var amount) || amount <= 0)
        {
            return Result<ExpenseRequestDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Geçerli bir tutar girin.", 400, new { field = "amount" }));
        }

        var expense = new ExpenseRequest
        {
            UserId = userId,
            Type = request.Type.Trim(),
            Amount = amount,
            Date = request.Date,
            ReceiptUrl = request.ReceiptUrl,
            Note = request.Note,
        };
        dbContext.ExpenseRequests.Add(expense);
        await dbContext.SaveChangesAsync(ct);

        return Result<ExpenseRequestDto>.Ok(ToDto(expense, null));
    }

    public async Task<Result<IReadOnlyList<ExpenseRequestDto>>> GetPendingExpenseRequestsAsync(
        CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var denied = await EnsureModuleAsync(userId, ModuleCodes.ExpenseApproval, ct);
        if (denied is not null)
        {
            return Result<IReadOnlyList<ExpenseRequestDto>>.Fail(denied);
        }

        // Onay ekranı: kendi talepleri HARİÇ tenant'taki bekleyenler + talep eden adı
        // (ad-soyad PII maskelemesi gerektirmez; onaycının görmesi iş gereği — PRD §10.1).
        var pending = await dbContext.ExpenseRequests.AsNoTracking()
            .Include(e => e.User)
            .Where(e => e.Status == RequestStatus.Pending && e.UserId != userId)
            .ToListAsync(ct);

        return Result<IReadOnlyList<ExpenseRequestDto>>.Ok(pending
            .OrderBy(e => e.CreatedAt)
            .Select(e => ToDto(e, FullName(e.User)))
            .ToList());
    }

    public async Task<Result<IReadOnlyList<LeaveRequestDto>>> GetPendingLeaveRequestsAsync(
        CancellationToken ct = default)
    {
        var userId = RequiredUserId;
        var denied = await EnsureModuleAsync(userId, ModuleCodes.ExpenseApproval, ct);
        if (denied is not null)
        {
            return Result<IReadOnlyList<LeaveRequestDto>>.Fail(denied);
        }

        var pending = await dbContext.LeaveRequests.AsNoTracking()
            .Where(l => l.Status == RequestStatus.Pending && l.UserId != userId)
            .ToListAsync(ct);

        return Result<IReadOnlyList<LeaveRequestDto>>.Ok(
            pending.OrderBy(l => l.CreatedAt).Select(ToDto).ToList());
    }

    public Task<Result<ExpenseRequestDto>> DecideExpenseRequestAsync(
        Guid id, bool approve, DecisionDto decision, CancellationToken ct = default) =>
        DecideAsync(dbContext.ExpenseRequests, id, approve, decision, e => ToDto(e, null), ct);

    public async Task<PagedResponse<LeaveRequestDto>> GetCompanyLeaveRequestsAsync(
        string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var requests = await FilterByStatus(dbContext.LeaveRequests.AsNoTracking(), status)
            .ToListAsync(ct);
        var ordered = requests.OrderByDescending(l => l.CreatedAt).ToList();

        return new PagedResponse<LeaveRequestDto>(
            ordered.Skip((page - 1) * pageSize).Take(pageSize).Select(ToDto).ToList(),
            page, pageSize, ordered.Count);
    }

    public async Task<PagedResponse<ExpenseRequestDto>> GetCompanyExpenseRequestsAsync(
        string? status, int page, int pageSize, CancellationToken ct = default)
    {
        var requests = await FilterByStatus(dbContext.ExpenseRequests.AsNoTracking()
                .Include(e => e.User), status)
            .ToListAsync(ct);
        var ordered = requests.OrderByDescending(e => e.CreatedAt).ToList();

        return new PagedResponse<ExpenseRequestDto>(
            ordered.Skip((page - 1) * pageSize).Take(pageSize)
                .Select(e => ToDto(e, FullName(e.User))).ToList(),
            page, pageSize, ordered.Count);
    }

    /// <summary>
    /// Ortak karar akışı: onay yetkisi + yalnız pending'ten geçiş + kendi talebini
    /// onaylayamama. Tenant izolasyonu query filter ile (başka tenant'ın talebi 404).
    /// </summary>
    private async Task<Result<TDto>> DecideAsync<TEntity, TDto>(
        DbSet<TEntity> set, Guid id, bool approve, DecisionDto decision,
        Func<TEntity, TDto> toDto, CancellationToken ct)
        where TEntity : BaseEntity
    {
        var userId = RequiredUserId;
        var denied = await EnsureModuleAsync(userId, ModuleCodes.ExpenseApproval, ct);
        if (denied is not null)
        {
            return Result<TDto>.Fail(denied);
        }

        var entity = await set.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (entity is null)
        {
            return Result<TDto>.Fail(new Error(ErrorCodes.NotFound, "Talep bulunamadı.", 404));
        }

        // Ortak alanlara entity tipinden bağımsız erişim (iki talep tipi aynı karar şemasını taşır).
        var (status, requesterId) = entity switch
        {
            LeaveRequest l => (l.Status, l.UserId),
            ExpenseRequest e => (e.Status, e.UserId),
            _ => throw new InvalidOperationException("Bilinmeyen talep tipi."),
        };

        if (requesterId == userId)
        {
            return Result<TDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Kendi talebinizi onaylayamazsınız.", 400));
        }

        if (status != RequestStatus.Pending)
        {
            return Result<TDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Talep zaten karara bağlanmış.", 400,
                new { currentStatus = EnumConverters.RequestStatusToDb(status) }));
        }

        var newStatus = approve ? RequestStatus.Approved : RequestStatus.Rejected;
        var now = timeProvider.GetUtcNow();
        switch (entity)
        {
            case LeaveRequest l:
                l.Status = newStatus;
                l.DecidedBy = userId;
                l.DecidedAt = now;
                l.DecisionNote = decision.Note;
                break;
            case ExpenseRequest e:
                e.Status = newStatus;
                e.DecidedBy = userId;
                e.DecidedAt = now;
                e.DecisionNote = decision.Note;
                break;
        }

        await dbContext.SaveChangesAsync(ct);
        return Result<TDto>.Ok(toDto(entity));
    }

    private async Task<Error?> EnsureModuleAsync(Guid userId, string moduleCode, CancellationToken ct) =>
        await moduleAccess.HasModuleAsync(userId, moduleCode, ct)
            ? null
            : new Error(ErrorCodes.NotAuthorizedModule,
                "Bu modül için yetkiniz yok.", 403, new { module = moduleCode });

    private Guid RequiredUserId => tenantContext.UserId
        ?? throw new InvalidOperationException("Kullanıcı bağlamı yok.");

    private static IQueryable<T> FilterByStatus<T>(IQueryable<T> query, string? status)
        where T : class
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return query;
        }

        var parsed = EnumConverters.RequestStatusFromDb(status.Trim().ToLowerInvariant());
        return query switch
        {
            IQueryable<LeaveRequest> leaves => (IQueryable<T>)leaves.Where(l => l.Status == parsed),
            IQueryable<ExpenseRequest> expenses => (IQueryable<T>)expenses.Where(e => e.Status == parsed),
            _ => query,
        };
    }

    private static string? FullName(User? user) => user is null
        ? null
        : string.Join(' ', new[] { user.FirstName, user.LastName }
            .Where(part => !string.IsNullOrWhiteSpace(part)));

    private static LeaveRequestDto ToDto(LeaveRequest l) => new(
        l.Id, l.Type, l.StartDate, l.EndDate, l.Days, l.Note,
        EnumConverters.RequestStatusToDb(l.Status), l.DecidedBy, l.DecidedAt, l.CreatedAt);

    private static ExpenseRequestDto ToDto(ExpenseRequest e, string? requesterName) => new(
        e.Id, e.Type, e.Amount.ToString("F2", CultureInfo.InvariantCulture), e.Date,
        e.ReceiptUrl, e.Note, EnumConverters.RequestStatusToDb(e.Status),
        e.DecidedBy, e.DecidedAt, e.CreatedAt, requesterName);
}
