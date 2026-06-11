using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Hr;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Hr;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.UnitTests.Hr;

/// <summary>
/// İK modülleri (TODO 2.4): modül yetkisi (NOT_AUTHORIZED_MODULE), gün hesabı,
/// onay akışı (pending'ten geçiş, kendi talebini onaylayamama), tenant izolasyonu.
/// </summary>
public sealed class HrServiceTests : IDisposable
{
    private static readonly Guid TenantA = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid TenantB = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly DateTimeOffset Now = new(2026, 6, 11, 12, 0, 0, TimeSpan.Zero);

    private readonly SqliteConnection _connection;
    private readonly Guid _employeeA = Guid.NewGuid();   // leave+expense yetkili
    private readonly Guid _approverA = Guid.NewGuid();   // +expense_approval yetkili
    private readonly Guid _noModuleA = Guid.NewGuid();   // segmentsiz — modül yetkisi yok
    private readonly Guid _employeeB = Guid.NewGuid();   // başka tenant

    public HrServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        using var seed = CreateContext(tenantId: null, userId: null);
        seed.Database.EnsureCreated();

        seed.Tenants.AddRange(
            new Tenant { Id = TenantA, Name = "A", Code = "A", Status = TenantStatus.Active },
            new Tenant { Id = TenantB, Name = "B", Code = "B", Status = TenantStatus.Active });

        seed.Users.AddRange(
            new User { Id = _employeeA, TenantId = TenantA, Phone = "1", FirstName = "Ali", LastName = "Çalışan" },
            new User { Id = _approverA, TenantId = TenantA, Phone = "2", FirstName = "Onay", LastName = "Veren" },
            new User { Id = _noModuleA, TenantId = TenantA, Phone = "3" },
            new User { Id = _employeeB, TenantId = TenantB, Phone = "1" });

        var leaveModule = new Module { Code = ModuleCodes.LeaveRequest, Name = "İzin", IsActive = true };
        var expenseModule = new Module { Code = ModuleCodes.ExpenseRequest, Name = "Masraf", IsActive = true };
        var approvalModule = new Module { Code = ModuleCodes.ExpenseApproval, Name = "Onay", IsActive = true };
        seed.Modules.AddRange(leaveModule, expenseModule, approvalModule);

        var employeesA = new Segment { TenantId = TenantA, Name = "Çalışanlar" };
        var approversA = new Segment { TenantId = TenantA, Name = "Yöneticiler" };
        var employeesB = new Segment { TenantId = TenantB, Name = "Çalışanlar" };
        seed.Segments.AddRange(employeesA, approversA, employeesB);

        seed.UserSegments.AddRange(
            new UserSegment { UserId = _employeeA, SegmentId = employeesA.Id },
            new UserSegment { UserId = _approverA, SegmentId = employeesA.Id },
            new UserSegment { UserId = _approverA, SegmentId = approversA.Id },
            new UserSegment { UserId = _employeeB, SegmentId = employeesB.Id });

        seed.SegmentModules.AddRange(
            new SegmentModule { SegmentId = employeesA.Id, ModuleId = leaveModule.Id },
            new SegmentModule { SegmentId = employeesA.Id, ModuleId = expenseModule.Id },
            new SegmentModule { SegmentId = approversA.Id, ModuleId = approvalModule.Id },
            new SegmentModule { SegmentId = employeesB.Id, ModuleId = leaveModule.Id },
            new SegmentModule { SegmentId = employeesB.Id, ModuleId = expenseModule.Id });

        seed.SaveChanges();
    }

    // ── Modül yetkisi backend'de zorlanır (PRD §2.1) ─────────────────────────

    [Fact]
    public async Task User_without_module_gets_403_not_authorized_module()
    {
        var result = await CreateService(TenantA, _noModuleA)
            .CreateLeaveRequestAsync(new CreateLeaveRequestDto(
                "annual", new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5), null));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotAuthorizedModule, result.Error!.Code);
        Assert.Equal(403, result.Error.HttpStatus);
    }

    [Fact]
    public async Task Non_approver_cannot_list_pending_requests()
    {
        var result = await CreateService(TenantA, _employeeA).GetPendingExpenseRequestsAsync();

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.NotAuthorizedModule, result.Error!.Code);
    }

    // ── Gün sayısını backend hesaplar (API_CONTRACT §11) ─────────────────────

    [Fact]
    public async Task Leave_days_are_computed_inclusive()
    {
        var result = await CreateService(TenantA, _employeeA)
            .CreateLeaveRequestAsync(new CreateLeaveRequestDto(
                "annual", new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 5), "tatil"));

        Assert.True(result.IsSuccess);
        Assert.Equal(5, result.Value.Days);
        Assert.Equal("pending", result.Value.Status);
    }

    [Fact]
    public async Task Leave_with_end_before_start_is_rejected()
    {
        var result = await CreateService(TenantA, _employeeA)
            .CreateLeaveRequestAsync(new CreateLeaveRequestDto(
                "annual", new DateOnly(2026, 7, 5), new DateOnly(2026, 7, 1), null));

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, result.Error!.Code);
    }

    // ── Onay akışı ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Approver_sees_pending_excluding_own_and_approves_with_requester_name()
    {
        var expense = await CreateExpenseAsync(_employeeA, "1500.00");

        var pending = await CreateService(TenantA, _approverA).GetPendingExpenseRequestsAsync();
        Assert.True(pending.IsSuccess);
        var item = Assert.Single(pending.Value);
        Assert.Equal(expense.Id, item.Id);
        Assert.Equal("Ali Çalışan", item.RequesterName);

        var decided = await CreateService(TenantA, _approverA)
            .DecideExpenseRequestAsync(expense.Id, approve: true, new DecisionDto("uygun"));
        Assert.True(decided.IsSuccess);
        Assert.Equal("approved", decided.Value.Status);
        Assert.Equal(_approverA, decided.Value.DecidedBy);
    }

    [Fact]
    public async Task Already_decided_request_cannot_be_decided_again()
    {
        var expense = await CreateExpenseAsync(_employeeA, "100.00");
        var service = CreateService(TenantA, _approverA);
        await service.DecideExpenseRequestAsync(expense.Id, approve: true, new DecisionDto(null));

        var second = await CreateService(TenantA, _approverA)
            .DecideExpenseRequestAsync(expense.Id, approve: false, new DecisionDto(null));

        Assert.False(second.IsSuccess);
        Assert.Equal(ErrorCodes.ValidationError, second.Error!.Code);
    }

    [Fact]
    public async Task Approver_cannot_decide_own_request()
    {
        // Onaycının kendisi de masraf talebi açabilir (employees segmentinde).
        var own = await CreateExpenseAsync(_approverA, "200.00");

        var result = await CreateService(TenantA, _approverA)
            .DecideExpenseRequestAsync(own.Id, approve: true, new DecisionDto(null));

        Assert.False(result.IsSuccess);
        Assert.Equal("Kendi talebinizi onaylayamazsınız.", result.Error!.Message);
    }

    // ── Tenant izolasyonu ────────────────────────────────────────────────────

    [Fact]
    public async Task Approver_cannot_see_or_decide_other_tenants_request()
    {
        var foreign = await CreateLeaveAsync(_employeeB, TenantB);

        var pending = await CreateService(TenantA, _approverA).GetPendingLeaveRequestsAsync();
        Assert.True(pending.IsSuccess);
        Assert.DoesNotContain(pending.Value, l => l.Id == foreign.Id);

        var decide = await CreateService(TenantA, _approverA)
            .DecideLeaveRequestAsync(foreign.Id, approve: true, new DecisionDto(null));
        Assert.False(decide.IsSuccess);
        Assert.Equal(ErrorCodes.NotFound, decide.Error!.Code);
    }

    [Fact]
    public async Task Company_view_lists_only_own_tenant_with_status_filter()
    {
        await CreateExpenseAsync(_employeeA, "300.00");
        await CreateLeaveAsync(_employeeB, TenantB);

        var expenses = await CreateService(TenantA, _approverA)
            .GetCompanyExpenseRequestsAsync("pending", 1, 20);
        Assert.Equal(1, expenses.Total);

        var leaves = await CreateService(TenantA, _approverA)
            .GetCompanyLeaveRequestsAsync(null, 1, 20);
        Assert.Equal(0, leaves.Total); // B'nin izni A görünümüne sızmaz
    }

    // ── Yardımcılar ──────────────────────────────────────────────────────────

    private async Task<ExpenseRequestDto> CreateExpenseAsync(Guid userId, string amount)
    {
        var result = await CreateService(TenantA, userId).CreateExpenseRequestAsync(
            new CreateExpenseRequestDto("travel", amount, new DateOnly(2026, 6, 10), null, null));
        Assert.True(result.IsSuccess);
        return result.Value;
    }

    private async Task<LeaveRequestDto> CreateLeaveAsync(Guid userId, Guid tenantId)
    {
        var result = await CreateService(tenantId, userId).CreateLeaveRequestAsync(
            new CreateLeaveRequestDto("annual", new DateOnly(2026, 7, 1), new DateOnly(2026, 7, 2), null));
        Assert.True(result.IsSuccess);
        return result.Value;
    }

    private HrService CreateService(Guid tenantId, Guid userId)
    {
        var context = CreateContext(tenantId, userId);
        return new HrService(context, new StubTenantContext(tenantId, userId),
            new ModuleAccessChecker(context), new FixedTimeProvider(Now));
    }

    private AppDbContext CreateContext(Guid? tenantId, Guid? userId)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new AppDbContext(options, new StubTenantContext(tenantId, userId));
    }

    public void Dispose() => _connection.Dispose();

    private sealed class StubTenantContext(Guid? tenantId, Guid? userId = null) : ITenantContext
    {
        public Guid? TenantId => tenantId;
        public Guid? UserId => userId;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId => TenantId ?? throw new InvalidOperationException();
    }

    private sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
