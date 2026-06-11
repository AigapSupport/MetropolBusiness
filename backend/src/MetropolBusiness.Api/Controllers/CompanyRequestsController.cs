using MetropolBusiness.Api.Auth;
using MetropolBusiness.Application.Hr;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Firma admin İK genel görünümü (API_CONTRACT §12, PANELS_SPEC A.9) — salt liste;
/// onay yetkisi approver'dadır (mobil/onay uçları HrModulesController'da).
/// Onaylayıcı atama (PUT approvers) ilk sürümde YOK: approver rolü + expense_approval
/// modül yetkisi yeterli (PRD §17.6 tek aşamalı karar — TODO notu).
/// </summary>
[ApiController]
[Route("api/v1/admin/company")]
[Authorize(Policy = PolicyNames.CompanyAdmin)]
public class CompanyRequestsController(IHrService hr) : ControllerBase
{
    [HttpGet("leave-requests")]
    public async Task<IActionResult> GetLeaveRequests(
        [FromQuery] string? status, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await hr.GetCompanyLeaveRequestsAsync(status, page, pageSize, ct));

    [HttpGet("expense-requests")]
    public async Task<IActionResult> GetExpenseRequests(
        [FromQuery] string? status, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await hr.GetCompanyExpenseRequestsAsync(status, page, pageSize, ct));
}
