using MetropolBusiness.Api.Auth;
using MetropolBusiness.Application.Tenants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>Denetim kaydı (API_CONTRACT §13, PANELS_SPEC B.8) — salt-okunur.</summary>
[ApiController]
[Route("api/v1/platform/audit-logs")]
[Authorize(Policy = PolicyNames.PlatformAdmin)]
public class PlatformAuditController(IAuditQueryService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? action, [FromQuery] string? entity,
        [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default) =>
        Ok(await audit.GetAsync(action, entity, from, to, page, pageSize, ct));
}
