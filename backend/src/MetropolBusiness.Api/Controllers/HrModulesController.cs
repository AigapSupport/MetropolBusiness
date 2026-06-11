using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Hr;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// İK modül uçları (API_CONTRACT §11). Modül yetkisi servis içinde doğrulanır
/// (NOT_AUTHORIZED_MODULE 403) — rol policy'si değil segment-modül zinciri esastır.
/// </summary>
[ApiController]
[Route("api/v1/modules")]
[Authorize(Policy = PolicyNames.TenantUser)]
public class HrModulesController(IHrService hr) : ControllerBase
{
    [HttpGet("leave-requests")]
    public async Task<IActionResult> GetLeaveRequests(CancellationToken ct)
    {
        var result = await hr.GetMyLeaveRequestsAsync(ct);
        return result.IsSuccess ? Ok(new { items = result.Value }) : result.ToActionResult();
    }

    [HttpPost("leave-requests")]
    public async Task<IActionResult> CreateLeaveRequest(
        [FromBody] CreateLeaveRequestDto request, CancellationToken ct) =>
        (await hr.CreateLeaveRequestAsync(request, ct)).ToActionResult(StatusCodes.Status201Created);

    [HttpGet("leave-requests/pending")]
    public async Task<IActionResult> GetPendingLeaveRequests(CancellationToken ct)
    {
        var result = await hr.GetPendingLeaveRequestsAsync(ct);
        return result.IsSuccess ? Ok(new { items = result.Value }) : result.ToActionResult();
    }

    [HttpPost("leave-requests/{id:guid}/approve")]
    public async Task<IActionResult> ApproveLeave(
        Guid id, [FromBody] DecisionDto decision, CancellationToken ct) =>
        (await hr.DecideLeaveRequestAsync(id, approve: true, decision, ct)).ToActionResult();

    [HttpPost("leave-requests/{id:guid}/reject")]
    public async Task<IActionResult> RejectLeave(
        Guid id, [FromBody] DecisionDto decision, CancellationToken ct) =>
        (await hr.DecideLeaveRequestAsync(id, approve: false, decision, ct)).ToActionResult();

    [HttpGet("expense-requests")]
    public async Task<IActionResult> GetExpenseRequests(CancellationToken ct)
    {
        var result = await hr.GetMyExpenseRequestsAsync(ct);
        return result.IsSuccess ? Ok(new { items = result.Value }) : result.ToActionResult();
    }

    [HttpPost("expense-requests")]
    public async Task<IActionResult> CreateExpenseRequest(
        [FromBody] CreateExpenseRequestDto request, CancellationToken ct) =>
        (await hr.CreateExpenseRequestAsync(request, ct)).ToActionResult(StatusCodes.Status201Created);

    [HttpGet("expense-requests/pending")]
    public async Task<IActionResult> GetPendingExpenseRequests(CancellationToken ct)
    {
        var result = await hr.GetPendingExpenseRequestsAsync(ct);
        return result.IsSuccess ? Ok(new { items = result.Value }) : result.ToActionResult();
    }

    [HttpPost("expense-requests/{id:guid}/approve")]
    public async Task<IActionResult> ApproveExpense(
        Guid id, [FromBody] DecisionDto decision, CancellationToken ct) =>
        (await hr.DecideExpenseRequestAsync(id, approve: true, decision, ct)).ToActionResult();

    [HttpPost("expense-requests/{id:guid}/reject")]
    public async Task<IActionResult> RejectExpense(
        Guid id, [FromBody] DecisionDto decision, CancellationToken ct) =>
        (await hr.DecideExpenseRequestAsync(id, approve: false, decision, ct)).ToActionResult();
}
